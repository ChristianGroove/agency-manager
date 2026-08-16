'use server'

/**
 * ==============================================================================
 * ADD-ONS & UPSELLS SERVER ACTIONS
 * File: src/modules/features/catalog/addons-actions.ts
 * Global & Item-Specific Add-on Groups, Upsells & Parent Cache Synchronization
 * ==============================================================================
 */

import { createClient } from '@/modules/core/database/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { revalidatePath } from 'next/cache'
import { CatalogAddonGroup, CatalogAddonOption, CatalogAddon } from '@/types/catalog'
import {
  catalogAddonGroupSchema,
  CatalogAddonGroupInput,
} from './schemas/catalog.schema'

/**
 * 1. Get add-ons (global, item-specific, or all) for tenant
 */
export async function getAddonsAction(params?: {
  scope?: 'global' | 'item' | 'all'
  itemId?: string
  orgId?: string
}): Promise<CatalogAddonGroup[]> {
  try {
    const supabase = await createClient()
    const orgId = params?.orgId || (await getCurrentOrganizationId())
    if (!orgId) return []

    if (params?.itemId) {
      // 1. Fetch global addons
      const { data: globalAddons } = await supabase
        .from('service_catalog_addons')
        .select('*')
        .eq('organization_id', orgId)
        .eq('scope', 'global')
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      // 2. Fetch linked item addons via junction
      const { data: linkedJunction } = await supabase
        .from('service_catalog_item_addons')
        .select('addon_id, order_index, addon:service_catalog_addons(*)')
        .eq('item_id', params.itemId)
        .order('order_index', { ascending: true })

      const linkedAddons = (linkedJunction || [])
        .map((lj: any) => lj.addon)
        .filter(Boolean)

      const merged = [...(globalAddons || []), ...linkedAddons]
      const seen = new Set<string>()
      const uniqueAddons: any[] = []

      for (const addon of merged) {
        if (!seen.has(addon.id)) {
          seen.add(addon.id)
          uniqueAddons.push(addon)
        }
      }

      return uniqueAddons.map((row) => ({
        id: row.id,
        organization_id: row.organization_id,
        name: row.name,
        description: row.description,
        selection_type: row.selection_type || 'multiple',
        is_required: row.is_required ?? false,
        min_selections: row.min_selections ?? 0,
        max_selections: row.max_selections ?? 10,
        options: (row.options || []) as CatalogAddonOption[],
        order_index: row.order_index ?? 0,
        is_active: row.is_active ?? true,
      }))
    }

    let query = supabase
      .from('service_catalog_addons')
      .select('*')
      .eq('organization_id', orgId)

    if (params?.scope && params.scope !== 'all') {
      query = query.eq('scope', params.scope)
    }

    const { data, error } = await query
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching addons:', error)
      return []
    }

    return (data || []).map((row) => ({
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      description: row.description,
      selection_type: row.selection_type || 'multiple',
      is_required: row.is_required ?? false,
      min_selections: row.min_selections ?? 0,
      max_selections: row.max_selections ?? 10,
      options: (row.options || []) as CatalogAddonOption[],
      order_index: row.order_index ?? 0,
      is_active: row.is_active ?? true,
    }))
  } catch (err) {
    console.error('Unexpected error in getAddonsAction:', err)
    return []
  }
}

/**
 * 2. Create a new add-on group
 */
export async function createAddonAction(
  input: CatalogAddonGroupInput,
  options?: { itemId?: string; scope?: 'global' | 'item' }
): Promise<{ success: boolean; data?: CatalogAddonGroup; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = input.organization_id || (await getCurrentOrganizationId())
    if (!orgId) throw new Error('No organization context found')

    const validated = catalogAddonGroupSchema.parse({
      ...input,
      organization_id: orgId,
    })

    const { data: existingAddons } = await supabase
      .from('service_catalog_addons')
      .select('order_index')
      .eq('organization_id', orgId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrder = (existingAddons?.[0]?.order_index ?? -1) + 1

    const { data: newAddon, error } = await supabase
      .from('service_catalog_addons')
      .insert({
        organization_id: orgId,
        name: validated.name,
        description: validated.description || null,
        price: validated.options?.[0]?.price_delta || 0,
        price_type: 'fixed',
        selection_type: validated.selection_type,
        is_required: validated.is_required,
        min_selections: validated.min_selections,
        max_selections: validated.max_selections,
        max_quantity: 1,
        options: validated.options,
        is_active: validated.is_active ?? true,
        scope: options?.scope || 'item',
        order_index: validated.order_index ?? nextOrder,
        metadata: {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating addon:', error)
      return { success: false, error: error.message }
    }

    if (options?.itemId) {
      await supabase.from('service_catalog_item_addons').insert({
        item_id: options.itemId,
        addon_id: newAddon.id,
        order_index: 0,
      })
    }

    revalidatePath('/portfolio')
    revalidatePath('/services')
    return { success: true, data: newAddon as CatalogAddonGroup }
  } catch (err: any) {
    console.error('createAddonAction error:', err)
    return { success: false, error: err.message || 'Error al crear adicional' }
  }
}

/**
 * 3. Update an existing add-on group
 */
export async function updateAddonAction(
  id: string,
  input: Partial<CatalogAddonGroupInput>
): Promise<{ success: boolean; data?: CatalogAddonGroup; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context found')

    const updatePayload: any = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await supabase
      .from('service_catalog_addons')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('Error updating addon:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/portfolio')
    revalidatePath('/services')
    return { success: true, data: updated as CatalogAddonGroup }
  } catch (err: any) {
    console.error('updateAddonAction error:', err)
    return { success: false, error: err.message || 'Error al actualizar adicional' }
  }
}

/**
 * 4. Delete an add-on group
 */
export async function deleteAddonAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context found')

    await supabase.from('service_catalog_item_addons').delete().eq('addon_id', id)

    const { error } = await supabase
      .from('service_catalog_addons')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) {
      console.error('Error deleting addon:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/portfolio')
    revalidatePath('/services')
    return { success: true }
  } catch (err: any) {
    console.error('deleteAddonAction error:', err)
    return { success: false, error: err.message || 'Error al eliminar adicional' }
  }
}

/**
 * 5. Synchronize add-on links for a specific catalog item and update parent cache
 */
export async function syncItemAddonsAction(
  itemId: string,
  addonIds: string[]
): Promise<{ success: boolean; linkedAddonIds?: string[]; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context found')

    // Delete existing links for item
    await supabase
      .from('service_catalog_item_addons')
      .delete()
      .eq('item_id', itemId)

    // Insert new links
    if (addonIds.length > 0) {
      const rows = addonIds.map((addonId, idx) => ({
        item_id: itemId,
        addon_id: addonId,
        order_index: idx,
      }))
      await supabase.from('service_catalog_item_addons').insert(rows)
    }

    // Refresh parent cache in service_catalog
    const { data: addonDetails } = await supabase
      .from('service_catalog_addons')
      .select('*')
      .in('id', addonIds)
      .eq('organization_id', orgId)

    const addonGroupsCache = (addonDetails || []).map((a) => ({
      id: a.id,
      organization_id: a.organization_id,
      name: a.name,
      description: a.description,
      selection_type: a.selection_type || 'multiple',
      is_required: a.is_required ?? false,
      min_selections: a.min_selections ?? 0,
      max_selections: a.max_selections ?? 10,
      options: (a.options || []) as CatalogAddonOption[],
      order_index: a.order_index ?? 0,
      is_active: a.is_active ?? true,
    }))

    await supabase
      .from('service_catalog')
      .update({
        addon_groups: addonGroupsCache,
        add_ons: addonGroupsCache,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('organization_id', orgId)

    revalidatePath('/portfolio')
    revalidatePath('/services')
    return { success: true, linkedAddonIds: addonIds }
  } catch (err: any) {
    console.error('syncItemAddonsAction error:', err)
    return { success: false, error: err.message || 'Error al sincronizar adicionales' }
  }
}
