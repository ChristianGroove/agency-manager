'use server'

/**
 * ==============================================================================
 * ATTRIBUTES & VARIANTS SERVER ACTIONS
 * File: src/modules/features/catalog/attributes-actions.ts
 * Reusable Attribute Groups & Item Variant Matrix Batch Reconciliation Engine
 * ==============================================================================
 */

import { createClient } from '@/modules/core/database/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { revalidatePath } from 'next/cache'
import {
  CatalogAttributeGroup,
  CatalogAttributeOption,
  CatalogVariant,
} from '@/types/catalog'
import {
  catalogAttributeGroupSchema,
  CatalogAttributeGroupInput,
  CatalogVariantInput,
} from './schemas/catalog.schema'

/**
 * 1. Get all reusable attribute groups for current organization
 */
export async function getAttributeGroupsAction(orgId?: string): Promise<CatalogAttributeGroup[]> {
  try {
    const supabase = await createClient()
    const organizationId = orgId || (await getCurrentOrganizationId())
    if (!organizationId) return []

    const { data, error } = await supabase
      .from('service_catalog_attributes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching attribute groups:', error)
      return []
    }

    return (data || []).map((row) => ({
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      slug: row.slug,
      swatch_type: row.display_type || row.type || 'pill',
      display_type: row.display_type || 'pill',
      type: row.type || 'pills',
      options: (row.options || []) as CatalogAttributeOption[],
      order_index: row.order_index,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
  } catch (err) {
    console.error('Unexpected error in getAttributeGroupsAction:', err)
    return []
  }
}

/**
 * 2. Create a new reusable attribute group
 */
export async function createAttributeGroupAction(
  input: CatalogAttributeGroupInput
): Promise<{ success: boolean; data?: CatalogAttributeGroup; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = input.organization_id || (await getCurrentOrganizationId())
    if (!orgId) throw new Error('No organization context found')

    const validated = catalogAttributeGroupSchema.parse({
      ...input,
      organization_id: orgId,
    })

    // Generate/verify unique slug per organization
    let slug = validated.slug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    if (!slug) {
      slug = `attr-${Date.now().toString(36)}`
    }

    // Check slug collision in tenant
    const { data: existingSlug } = await supabase
      .from('service_catalog_attributes')
      .select('id')
      .eq('organization_id', orgId)
      .eq('slug', slug)
      .maybeSingle()

    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36).substring(2, 6)}`
    }

    // Get next order index
    const { data: existingAttrs } = await supabase
      .from('service_catalog_attributes')
      .select('order_index')
      .eq('organization_id', orgId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrder = (existingAttrs?.[0]?.order_index ?? -1) + 1

    const { data: newGroup, error } = await supabase
      .from('service_catalog_attributes')
      .insert({
        organization_id: orgId,
        name: validated.name,
        slug,
        display_type: validated.swatch_type || validated.display_type || 'pill',
        type: validated.swatch_type || validated.type || 'pills',
        options: validated.options,
        order_index: validated.order_index ?? nextOrder,
        is_active: validated.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating attribute group:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/portfolio')
    revalidatePath('/services')
    return { success: true, data: newGroup as CatalogAttributeGroup }
  } catch (err: any) {
    console.error('createAttributeGroupAction error:', err)
    return { success: false, error: err.message || 'Error al crear grupo de atributos' }
  }
}

/**
 * 3. Update an existing attribute group
 */
export async function updateAttributeGroupAction(
  id: string,
  input: Partial<CatalogAttributeGroupInput>
): Promise<{ success: boolean; data?: CatalogAttributeGroup; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context found')

    const updatePayload: any = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    if (input.swatch_type) {
      updatePayload.display_type = input.swatch_type
      updatePayload.type = input.swatch_type
    }

    const { data: updated, error } = await supabase
      .from('service_catalog_attributes')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('Error updating attribute group:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/portfolio')
    revalidatePath('/services')
    return { success: true, data: updated as CatalogAttributeGroup }
  } catch (err: any) {
    console.error('updateAttributeGroupAction error:', err)
    return { success: false, error: err.message || 'Error al actualizar grupo de atributos' }
  }
}

/**
 * 4. Delete an attribute group
 */
export async function deleteAttributeGroupAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context found')

    const { error } = await supabase
      .from('service_catalog_attributes')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) {
      console.error('Error deleting attribute group:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/portfolio')
    revalidatePath('/services')
    return { success: true }
  } catch (err: any) {
    console.error('deleteAttributeGroupAction error:', err)
    return { success: false, error: err.message || 'Error al eliminar grupo de atributos' }
  }
}

/**
 * 5. Get variants for a specific catalog item
 */
export async function getItemVariantsAction(
  itemId: string,
  orgId?: string
): Promise<CatalogVariant[]> {
  try {
    const supabase = await createClient()
    const organizationId = orgId || (await getCurrentOrganizationId())
    if (!organizationId) return []

    const { data, error } = await supabase
      .from('service_catalog_variants')
      .select('*')
      .eq('catalog_item_id', itemId)
      .eq('organization_id', organizationId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching variants:', error)
      return []
    }

    return (data || []).map((v) => ({
      id: v.id,
      catalog_item_id: v.catalog_item_id,
      organization_id: v.organization_id,
      title: v.name || `Variante`,
      name: v.name,
      sku: v.sku,
      barcode: v.barcode,
      price_modifier: Number(v.price_modifier || 0),
      price_type: v.price_type || 'fixed',
      price_modifier_type: v.price_type || 'fixed',
      price_override: v.price_override ? Number(v.price_override) : null,
      inventory_quantity: v.inventory_quantity ?? 0,
      stock_quantity: v.stock_quantity ?? v.inventory_quantity ?? 0,
      track_inventory: v.track_inventory ?? false,
      track_stock: v.track_stock ?? v.track_inventory ?? false,
      is_active: v.is_active ?? true,
      order_index: v.order_index ?? 0,
      attributes: v.attributes || {},
      image_url: v.image_url,
      metadata: v.metadata || {},
      created_at: v.created_at,
      updated_at: v.updated_at,
    }))
  } catch (err) {
    console.error('Unexpected error in getItemVariantsAction:', err)
    return []
  }
}

/**
 * 6. Batch save/sync variants matrix and synchronize parent service_catalog cache
 */
export async function saveItemVariantsMatrixAction(
  itemId: string,
  variants: CatalogVariantInput[] | CatalogVariant[],
  attributeGroups?: CatalogAttributeGroup[]
): Promise<{ success: boolean; data?: CatalogVariant[]; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context found')

    // 1. Verify item ownership
    const { data: item, error: itemError } = await supabase
      .from('service_catalog')
      .select('id, name')
      .eq('id', itemId)
      .eq('organization_id', orgId)
      .single()

    if (itemError || !item) {
      throw new Error('Item no encontrado o sin permisos de acceso')
    }

    // 2. Fetch existing variants in DB
    const { data: existingVariants } = await supabase
      .from('service_catalog_variants')
      .select('id')
      .eq('catalog_item_id', itemId)
      .eq('organization_id', orgId)

    const incomingIds = new Set(variants.map((v) => v.id).filter(Boolean))
    const existingIds = (existingVariants || []).map((ev) => ev.id)
    const toDeleteIds = existingIds.filter((id) => !incomingIds.has(id))

    // 3. Delete removed variants
    if (toDeleteIds.length > 0) {
      await supabase
        .from('service_catalog_variants')
        .delete()
        .in('id', toDeleteIds)
        .eq('organization_id', orgId)
    }

    // 4. Upsert incoming variants
    if (variants.length > 0) {
      const rowsToUpsert = variants.map((v, idx) => {
        const isPersistedUUID =
          v.id &&
          !v.id.startsWith('var-gen-') &&
          !v.id.startsWith('temp_') &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id)

        return {
          id: isPersistedUUID ? v.id : crypto.randomUUID(),
          organization_id: orgId,
          catalog_item_id: itemId,
          name: v.title || (v as any).name || `Variante ${idx + 1}`,
          sku: v.sku || null,
          barcode: v.barcode || null,
          price_override: v.price_override ?? null,
          price_modifier: v.price_modifier ?? 0,
          price_type: v.price_type || 'fixed',
          inventory_quantity: Math.max(0, Math.floor(v.inventory_quantity ?? 0)),
          stock_quantity: v.stock_quantity ?? v.inventory_quantity ?? 0,
          track_inventory: v.track_inventory ?? false,
          track_stock: v.track_stock ?? v.track_inventory ?? false,
          is_active: v.is_active ?? true,
          order_index: v.order_index ?? idx,
          attributes: v.attributes || {},
          image_url: v.image_url || null,
          metadata: v.metadata || {},
          updated_at: new Date().toISOString(),
        }
      })

      const { error: upsertError } = await supabase
        .from('service_catalog_variants')
        .upsert(rowsToUpsert, { onConflict: 'id' })

      if (upsertError) {
        console.error('Error upserting variants:', upsertError)
        return { success: false, error: upsertError.message }
      }
    }

    // 5. Fetch fresh synchronized list
    const freshVariants = await getItemVariantsAction(itemId, orgId)

    // 6. Synchronize parent service_catalog JSONB cache
    const updatePayload: any = {
      has_variants: freshVariants.length > 0,
      variants: freshVariants,
      updated_at: new Date().toISOString(),
    }

    if (attributeGroups) {
      updatePayload.variant_attributes = attributeGroups
      updatePayload.variants_config = { attributes: attributeGroups }
    }

    await supabase
      .from('service_catalog')
      .update(updatePayload)
      .eq('id', itemId)
      .eq('organization_id', orgId)

    revalidatePath('/portfolio')
    revalidatePath('/services')
    return { success: true, data: freshVariants }
  } catch (err: any) {
    console.error('saveItemVariantsMatrixAction error:', err)
    return { success: false, error: err.message || 'Error al guardar variantes' }
  }
}

/**
 * 7. Delete individual variant
 */
export async function deleteVariantAction(
  variantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context found')

    const { data: variant } = await supabase
      .from('service_catalog_variants')
      .select('catalog_item_id')
      .eq('id', variantId)
      .eq('organization_id', orgId)
      .single()

    const { error } = await supabase
      .from('service_catalog_variants')
      .delete()
      .eq('id', variantId)
      .eq('organization_id', orgId)

    if (error) {
      console.error('Error deleting variant:', error)
      return { success: false, error: error.message }
    }

    if (variant?.catalog_item_id) {
      const remaining = await getItemVariantsAction(variant.catalog_item_id, orgId)
      await supabase
        .from('service_catalog')
        .update({
          variants: remaining,
          has_variants: remaining.length > 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variant.catalog_item_id)
        .eq('organization_id', orgId)
    }

    revalidatePath('/portfolio')
    return { success: true }
  } catch (err: any) {
    console.error('deleteVariantAction error:', err)
    return { success: false, error: err.message || 'Error al eliminar variante' }
  }
}
