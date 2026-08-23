'use server'

/**
 * ==============================================================================
 * UNIVERSAL MULTI-INDUSTRY CATALOG SERVER ACTIONS
 * File: src/modules/features/catalog/actions.ts
 * Module: Universal Catalog (Pixy Agency Manager)
 * 100% Backwards Compatible with Legacy Quotes, Invoices, Contracts, Briefings & CRM
 * ==============================================================================
 */

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import {
  UniversalCatalogItem,
  ServiceCatalogItem,
  CatalogClassification,
  CatalogGalleryImage,
  CatalogVariant,
  CatalogAddonGroup,
} from "@/types/catalog"
import { getCurrentOrganizationApp } from "@/modules/core/saas/app-data-actions"
import { SaasApp } from "@/types/saas"
import { CATALOG_TEMPLATES } from "./templates/data"
import {
  createCatalogItemSchema,
  updateCatalogItemSchema,
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
} from "./schemas/catalog.schema"

// ------------------------------------------------------------------------------
// INTERFACES & ACTION TYPES
// ------------------------------------------------------------------------------

export interface GetCatalogItemsFilter {
  categoryId?: string
  classification?: CatalogClassification
  type?: string
  search?: string
  isVisibleOnly?: boolean
  includeInactive?: boolean
  includeDeleted?: boolean
  sortBy?: 'order_index' | 'name' | 'price_asc' | 'price_desc' | 'created_at'
}

export interface AdjustInventoryInput {
  itemId: string
  variantId?: string | null
  quantityDelta: number
  mode?: 'delta' | 'set'
  reason?: 'sale' | 'restock' | 'return' | 'manual_adjustment' | 'damage'
  notes?: string
}

export interface AdjustInventoryResult {
  success: boolean
  itemId: string
  variantId?: string | null
  previousQuantity: number
  newQuantity: number
  isLowStock: boolean
  lowStockThreshold: number
  trackInventory: boolean
  error?: string
}

export interface DecrementStockItemInput {
  catalogItemId?: string
  itemId?: string
  item_id?: string
  variantId?: string | null
  variant_id?: string | null
  quantity: number
  allowBackordersOverride?: boolean
  allow_backorders_override?: boolean
}

export interface DecrementStockParams {
  organizationId?: string
  items: DecrementStockItemInput[]
}

export interface DecrementStockItemResult {
  itemId: string
  catalogItemId?: string
  variantId?: string | null
  previousStock: number
  newStock: number
  decrementedQuantity: number
  trackInventory: boolean
}

export interface DecrementStockResult {
  success: boolean
  decrementedItems?: DecrementStockItemResult[]
  updatedItems?: any[]
  error?: string
}

export interface RestoreStockItemInput {
  catalogItemId?: string
  itemId?: string
  item_id?: string
  variantId?: string | null
  variant_id?: string | null
  quantity: number
}

export interface RestoreStockParams {
  organizationId?: string
  items: RestoreStockItemInput[]
}

export interface RestoreStockItemResult {
  itemId: string
  catalogItemId?: string
  variantId?: string | null
  previousStock: number
  newStock: number
  restoredQuantity: number
}

export interface RestoreStockResult {
  success: boolean
  restoredItems?: RestoreStockItemResult[]
  error?: string
}

export interface UpdateItemStockInput {
  organizationId?: string
  catalogItemId?: string
  itemId?: string
  variantId?: string | null
  stockQuantity?: number
  quantity?: number
  mode?: 'set' | 'delta'
  trackInventory?: boolean
  allowBackorders?: boolean
  lowStockThreshold?: number
  sku?: string | null
  barcode?: string | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

import { normalizeCatalogItem } from './utils/normalize-catalog-item'


// ------------------------------------------------------------------------------
// 1. GET CATALOG ITEMS (New Action & Legacy Compat)
// ------------------------------------------------------------------------------

export async function getCatalogItemsAction(
  filters?: GetCatalogItemsFilter
): Promise<{ success: boolean; data: UniversalCatalogItem[]; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
      return { success: true, data: [] }
    }

    // Parallel fetch: Items and Categories
    let itemsQuery = supabase
      .from('service_catalog')
      .select('*')
      .eq('organization_id', orgId)

    if (!filters?.includeDeleted) {
      itemsQuery = itemsQuery.is('deleted_at', null)
    }

    if (!filters?.includeInactive) {
      itemsQuery = itemsQuery.eq('is_active', true)
    }

    if (filters?.isVisibleOnly) {
      itemsQuery = itemsQuery.eq('is_visible_in_portal', true)
    }

    if (filters?.classification) {
      itemsQuery = itemsQuery.eq('classification', filters.classification)
    }

    if (filters?.type) {
      itemsQuery = itemsQuery.eq('type', filters.type)
    }

    if (filters?.categoryId) {
      itemsQuery = itemsQuery.or(`category.eq.${filters.categoryId},category_id.eq.${filters.categoryId}`)
    }

    if (filters?.search) {
      const s = filters.search.trim()
      itemsQuery = itemsQuery.or(`name.ilike.%${s}%,description.ilike.%${s}%,sku.ilike.%${s}%`)
    }

    // Default DB ordering
    itemsQuery = itemsQuery.order('order_index', { ascending: true }).order('created_at', { ascending: true })

    const [
      { data: catalogItems, error: catalogError },
      { data: categories, error: categoryError },
    ] = await Promise.all([
      itemsQuery,
      supabase
        .from('service_categories')
        .select('id, name')
        .eq('organization_id', orgId),
    ])

    if (catalogError) {
      console.error('Error fetching catalog items:', catalogError)
      return { success: false, data: [], error: catalogError.message }
    }

    // Build category lookup map
    const categoryMap: Record<string, string> = {}
    for (const cat of categories || []) {
      categoryMap[cat.id] = cat.name
    }

    let normalized = (catalogItems || []).map((row) =>
      normalizeCatalogItem(row, categoryMap)
    )

    // Secondary sorting if requested
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'name':
          normalized.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          break
        case 'price_asc':
          normalized.sort((a, b) => (a.base_price || 0) - (b.base_price || 0))
          break
        case 'price_desc':
          normalized.sort((a, b) => (b.base_price || 0) - (a.base_price || 0))
          break
        case 'created_at':
          normalized.sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime()
          )
          break
        case 'order_index':
        default:
          normalized.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          break
      }
    }

    return { success: true, data: normalized }
  } catch (err: any) {
    console.error('Unexpected error in getCatalogItemsAction:', err)
    return { success: false, data: [], error: err.message || 'Error al obtener catálogo' }
  }
}

/**
 * Legacy getCatalogItems function for 100% backwards compatibility
 */
export async function getCatalogItems(
  filters?: GetCatalogItemsFilter
): Promise<ServiceCatalogItem[]> {
  const res = await getCatalogItemsAction(filters)
  return res.data
}

// ------------------------------------------------------------------------------
// 2. GET CATALOG ITEM BY ID
// ------------------------------------------------------------------------------

export async function getCatalogItemByIdAction(
  id: string
): Promise<{ success: boolean; data?: UniversalCatalogItem; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
      return { success: false, error: 'No se encontró contexto de organización' }
    }

    // Parallel fetch: Item, Variants, Addons, Categories
    const [
      { data: item, error: itemError },
      { data: variants },
      { data: linkedJunction },
      { data: categories },
    ] = await Promise.all([
      supabase
        .from('service_catalog')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .maybeSingle(),
      supabase
        .from('service_catalog_variants')
        .select('*')
        .eq('catalog_item_id', id)
        .eq('organization_id', orgId)
        .order('order_index', { ascending: true }),
      supabase
        .from('service_catalog_item_addons')
        .select('addon_id, order_index, addon:service_catalog_addons(*)')
        .eq('item_id', id)
        .order('order_index', { ascending: true }),
      supabase
        .from('service_categories')
        .select('id, name')
        .eq('organization_id', orgId),
    ])

    if (itemError || !item) {
      return { success: false, error: itemError?.message || 'Item no encontrado' }
    }

    const categoryMap: Record<string, string> = {}
    for (const cat of categories || []) {
      categoryMap[cat.id] = cat.name
    }

    const normalized = normalizeCatalogItem(item, categoryMap)

    // Merge relational variants if present
    if (variants && variants.length > 0) {
      normalized.variants = variants.map((v) => ({
        id: v.id,
        catalog_item_id: v.catalog_item_id,
        organization_id: v.organization_id,
        title: v.name || 'Variante',
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
      normalized.has_variants = true
    }

    // Merge relational addons if present
    if (linkedJunction && linkedJunction.length > 0) {
      const relationalAddons = linkedJunction
        .map((lj: any) => lj.addon)
        .filter(Boolean)

      if (relationalAddons.length > 0) {
        normalized.addon_groups = relationalAddons.map((a: any) => ({
          id: a.id,
          organization_id: a.organization_id,
          name: a.name,
          description: a.description,
          selection_type: a.selection_type || 'multiple',
          is_required: a.is_required ?? false,
          min_selections: a.min_selections ?? 0,
          max_selections: a.max_selections ?? 10,
          options: a.options || [],
          order_index: a.order_index ?? 0,
          is_active: a.is_active ?? true,
        }))
        normalized.add_ons = normalized.addon_groups
      }
    }

    return { success: true, data: normalized }
  } catch (err: any) {
    console.error('getCatalogItemByIdAction error:', err)
    return { success: false, error: err.message || 'Error al obtener producto' }
  }
}

/**
 * Legacy getCatalogItem function
 */
export async function getCatalogItem(
  id: string
): Promise<ServiceCatalogItem | null> {
  const res = await getCatalogItemByIdAction(id)
  return res.data || null
}

// ------------------------------------------------------------------------------
// 3. CREATE CATALOG ITEM
// ------------------------------------------------------------------------------

export async function createCatalogItemAction(
  input: CreateCatalogItemInput
): Promise<{ success: boolean; data?: UniversalCatalogItem; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = input.organization_id || (await getCurrentOrganizationId())
    if (!orgId) throw new Error('No se encontró contexto de organización')

    const validated = createCatalogItemSchema.parse({
      ...input,
      organization_id: orgId,
    })

    // 1. SKU Uniqueness check per organization (excluding soft deleted)
    if (validated.sku?.trim()) {
      const { data: existingSku } = await supabase
        .from('service_catalog')
        .select('id')
        .eq('organization_id', orgId)
        .eq('sku', validated.sku.trim())
        .is('deleted_at', null)
        .maybeSingle()

      if (existingSku) {
        return {
          success: false,
          error: `El SKU "${validated.sku}" ya está asignado a otro producto o servicio en su catálogo.`,
        }
      }
    }

    // 2. Barcode Uniqueness check per organization (excluding soft deleted)
    if (validated.barcode?.trim()) {
      const { data: existingBarcode } = await supabase
        .from('service_catalog')
        .select('id')
        .eq('organization_id', orgId)
        .eq('barcode', validated.barcode.trim())
        .is('deleted_at', null)
        .maybeSingle()

      if (existingBarcode) {
        return {
          success: false,
          error: `El código de barras "${validated.barcode}" ya está registrado en otro item.`,
        }
      }
    }

    // 3. Gallery Images & Cover Photo Auto-Mirroring
    let galleryImages = validated.gallery_images || []
    if (galleryImages.length === 0 && validated.image_url) {
      galleryImages = [
        {
          id: crypto.randomUUID(),
          url: validated.image_url,
          is_cover: true,
          order_index: 0,
        },
      ]
    }

    if (galleryImages.length > 0 && !galleryImages.some((img) => img.is_cover)) {
      galleryImages[0].is_cover = true
    }

    const coverUrl =
      galleryImages.find((img) => img.is_cover)?.url ||
      galleryImages[0]?.url ||
      validated.image_url ||
      null

    // 4. Auto-assign order_index if not provided
    let orderIndex = validated.order_index
    if (orderIndex === undefined || orderIndex === null) {
      const { data: maxItem } = await supabase
        .from('service_catalog')
        .select('order_index')
        .eq('organization_id', orgId)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle()

      orderIndex = (maxItem?.order_index ?? -1) + 1
    }

    // 5. Metadata Payload
    const safeMetadata = {
      ...(validated.metadata || {}),
      cta_type: validated.cta_type || 'whatsapp',
      price_label_type: validated.price_label_type || 'price',
    }

    const classificationMetadata = {
      physical: validated.physical_details || validated.classification_metadata?.physical,
      digital: validated.digital_details || validated.classification_metadata?.digital,
      service: validated.service_details || validated.classification_metadata?.service,
      subscription: validated.subscription_details || validated.classification_metadata?.subscription,
      real_estate: validated.real_estate_details || validated.classification_metadata?.real_estate,
    }

    // 6. DB Insertion
    const insertPayload: any = {
      organization_id: orgId,
      name: validated.name,
      description: validated.description || '',
      category: validated.category,
      category_id: validated.category_id || null,
      base_price: validated.base_price,
      compare_at_price: validated.compare_at_price ?? null,
      type: validated.type,
      classification: validated.classification || 'service',
      frequency: validated.frequency || null,
      image_url: coverUrl,
      gallery_images: galleryImages,
      video_url: validated.video_url || null,
      sku: validated.sku || null,
      barcode: validated.barcode || null,
      inventory_quantity: validated.inventory_quantity ?? 0,
      track_inventory: validated.track_inventory ?? false,
      allow_backorders: validated.allow_backorders ?? false,
      low_stock_threshold: validated.low_stock_threshold ?? 5,
      has_variants: validated.has_variants || (validated.variants && validated.variants.length > 0),
      variant_attributes: validated.variant_attributes || [],
      variants: validated.variants || [],
      variants_config: validated.variants_config || { attributes: validated.variant_attributes || [] },
      addon_groups: validated.addon_groups || [],
      badges: validated.badges || [],
      featured_badge: validated.featured_badge || null,
      specifications: validated.specifications || {},
      specs_tabs: validated.specs_tabs || [],
      seo_title: validated.seo_title || null,
      seo_description: validated.seo_description || null,
      seo_metadata: validated.seo_metadata || { search_tags: [] },
      classification_metadata: classificationMetadata,
      physical_details: validated.physical_details || null,
      digital_details: validated.digital_details || null,
      service_details: validated.service_details || null,
      subscription_details: validated.subscription_details || null,
      is_visible_in_portal: validated.is_visible_in_portal ?? true,
      is_active: validated.is_active ?? true,
      order_index: orderIndex,
      metadata: safeMetadata,
    }

    const { data: newItem, error: insertError } = await supabase
      .from('service_catalog')
      .insert(insertPayload)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting catalog item:', insertError)
      return { success: false, error: insertError.message }
    }

    // 7. Insert relational variants if provided
    if (validated.variants && validated.variants.length > 0) {
      const variantRows = validated.variants.map((v, idx) => ({
        id: crypto.randomUUID(),
        organization_id: orgId,
        catalog_item_id: newItem.id,
        name: v.title || (v as any).name || `Variante ${idx + 1}`,
        sku: v.sku || null,
        barcode: v.barcode || null,
        price_override: v.price_override ?? null,
        price_modifier: v.price_modifier ?? 0,
        price_type: v.price_type || 'fixed',
        inventory_quantity: Math.max(0, Math.floor(v.inventory_quantity ?? 0)),
        track_inventory: v.track_inventory ?? false,
        is_active: v.is_active ?? true,
        order_index: v.order_index ?? idx,
        attributes: v.attributes || {},
        image_url: v.image_url || null,
        metadata: v.metadata || {},
      }))

      await supabase.from('service_catalog_variants').insert(variantRows)
    }

    revalidatePath('/portfolio')
    revalidatePath('/dashboard')
    revalidatePath('/portal')
    revalidatePath('/services')

    return {
      success: true,
      data: normalizeCatalogItem(newItem),
    }
  } catch (err: any) {
    console.error('createCatalogItemAction error:', err)
    return { success: false, error: err.message || 'Error al crear item de catálogo' }
  }
}

/**
 * Legacy createCatalogItem function
 */
export async function createCatalogItem(
  data: Partial<ServiceCatalogItem>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const res = await createCatalogItemAction(data as any)
  if (!res.success) {
    throw new Error(res.error || 'Error al crear item')
  }
  return { success: true, data: res.data }
}

// ------------------------------------------------------------------------------
// 4. UPDATE CATALOG ITEM
// ------------------------------------------------------------------------------

export async function updateCatalogItemAction(
  id: string,
  data: UpdateCatalogItemInput
): Promise<{ success: boolean; data?: UniversalCatalogItem; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No se encontró contexto de organización')

    const validated = updateCatalogItemSchema.parse({ ...data, id })

    // Verify ownership
    const { data: existingItem, error: fetchError } = await supabase
      .from('service_catalog')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingItem) {
      return { success: false, error: 'Item no encontrado o sin permisos de modificación' }
    }

    // SKU uniqueness check excluding current item
    if (validated.sku?.trim() && validated.sku.trim() !== existingItem.sku) {
      const { data: duplicateSku } = await supabase
        .from('service_catalog')
        .select('id')
        .eq('organization_id', orgId)
        .eq('sku', validated.sku.trim())
        .neq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (duplicateSku) {
        return {
          success: false,
          error: `El SKU "${validated.sku}" ya está asignado a otro producto en su catálogo.`,
        }
      }
    }

    // Barcode uniqueness check excluding current item
    if (validated.barcode?.trim() && validated.barcode.trim() !== existingItem.barcode) {
      const { data: duplicateBarcode } = await supabase
        .from('service_catalog')
        .select('id')
        .eq('organization_id', orgId)
        .eq('barcode', validated.barcode.trim())
        .neq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (duplicateBarcode) {
        return {
          success: false,
          error: `El código de barras "${validated.barcode}" ya está registrado en otro item.`,
        }
      }
    }

    // Gallery & Cover Mirroring
    let galleryImages = validated.gallery_images ?? existingItem.gallery_images ?? []
    if (validated.gallery_images) {
      if (galleryImages.length > 0 && !galleryImages.some((img: any) => img.is_cover)) {
        galleryImages[0].is_cover = true
      }
    }

    const coverUrl =
      galleryImages.find((img: any) => img.is_cover)?.url ||
      galleryImages[0]?.url ||
      validated.image_url ||
      existingItem.image_url ||
      null

    // Safe deep merge of metadata and classification details
    const classificationMetadata = {
      ...(existingItem.classification_metadata || {}),
      ...(validated.classification_metadata || {}),
      ...(validated.physical_details ? { physical: validated.physical_details } : {}),
      ...(validated.digital_details ? { digital: validated.digital_details } : {}),
      ...(validated.service_details ? { service: validated.service_details } : {}),
      ...(validated.subscription_details ? { subscription: validated.subscription_details } : {}),
      ...(validated.real_estate_details ? { real_estate: validated.real_estate_details } : {}),
    }

    const safeMetadata = {
      ...(existingItem.metadata || {}),
      ...(validated.metadata || {}),
      ...(validated.cta_type ? { cta_type: validated.cta_type } : {}),
      ...(validated.price_label_type ? { price_label_type: validated.price_label_type } : {}),
      classification_metadata: classificationMetadata,
    }

    const updatePayload: any = {
      metadata: safeMetadata,
      image_url: coverUrl,
    }

    if (validated.name !== undefined) updatePayload.name = validated.name
    if (validated.description !== undefined) updatePayload.description = validated.description
    if (validated.category !== undefined) updatePayload.category = validated.category
    if (validated.category_id !== undefined) updatePayload.category_id = validated.category_id
    if (validated.base_price !== undefined) updatePayload.base_price = validated.base_price
    if (validated.compare_at_price !== undefined) updatePayload.compare_at_price = validated.compare_at_price
    if (validated.type !== undefined) updatePayload.type = validated.type
    if (validated.classification !== undefined) updatePayload.classification = validated.classification
    if (validated.frequency !== undefined) updatePayload.frequency = validated.frequency
    if (validated.gallery_images !== undefined) {
      updatePayload.gallery_images = galleryImages
    }
    if (validated.video_url !== undefined) updatePayload.video_url = validated.video_url
    if (validated.sku !== undefined) updatePayload.sku = validated.sku
    if (validated.barcode !== undefined) updatePayload.barcode = validated.barcode
    if (validated.inventory_quantity !== undefined) {
      updatePayload.inventory_quantity = validated.inventory_quantity
    }
    if (validated.track_inventory !== undefined) {
      updatePayload.track_inventory = validated.track_inventory
    }
    if (validated.allow_backorders !== undefined) updatePayload.allow_backorders = validated.allow_backorders
    if (validated.low_stock_threshold !== undefined) updatePayload.low_stock_threshold = validated.low_stock_threshold
    if (validated.has_variants !== undefined) updatePayload.has_variants = validated.has_variants
    if (validated.variant_attributes !== undefined) updatePayload.variant_attributes = validated.variant_attributes
    if (validated.variants !== undefined) updatePayload.variants = validated.variants
    if (validated.variants_config !== undefined) updatePayload.variants_config = validated.variants_config
    if (validated.addon_groups !== undefined) {
      updatePayload.addon_groups = validated.addon_groups
    }
    if (validated.badges !== undefined) updatePayload.badges = validated.badges
    if (validated.featured_badge !== undefined) updatePayload.featured_badge = validated.featured_badge
    if (validated.specifications !== undefined) updatePayload.specifications = validated.specifications
    if (validated.specs_tabs !== undefined) updatePayload.specs_tabs = validated.specs_tabs
    if (validated.seo_title !== undefined) updatePayload.seo_title = validated.seo_title
    if (validated.seo_description !== undefined) updatePayload.seo_description = validated.seo_description
    if (validated.seo_metadata !== undefined) updatePayload.seo_metadata = validated.seo_metadata
    if (validated.classification_metadata !== undefined || validated.physical_details || validated.digital_details || validated.service_details || validated.subscription_details || validated.real_estate_details) {
      updatePayload.classification_metadata = classificationMetadata
    }
    if (validated.physical_details !== undefined) updatePayload.physical_details = validated.physical_details
    if (validated.digital_details !== undefined) updatePayload.digital_details = validated.digital_details
    if (validated.service_details !== undefined) updatePayload.service_details = validated.service_details
    if (validated.subscription_details !== undefined) updatePayload.subscription_details = validated.subscription_details
    if (validated.real_estate_details !== undefined) updatePayload.real_estate_details = validated.real_estate_details
    if (validated.is_visible_in_portal !== undefined) updatePayload.is_visible_in_portal = validated.is_visible_in_portal
    if (validated.is_active !== undefined) updatePayload.is_active = validated.is_active
    if (validated.order_index !== undefined) updatePayload.order_index = validated.order_index

    const { data: updatedItem, error: updateError } = await supabase
      .from('service_catalog')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ UPDATE CATALOG ITEM ERROR:', updateError)
      return { success: false, error: updateError.message }
    }

    revalidatePath('/portfolio')
    revalidatePath('/dashboard')
    revalidatePath('/portal')
    revalidatePath('/services')

    return {
      success: true,
      data: normalizeCatalogItem(updatedItem),
    }
  } catch (err: any) {
    console.error('updateCatalogItemAction error:', err)
    return { success: false, error: err.message || 'Error al actualizar item de catálogo' }
  }
}

/**
 * Legacy updateCatalogItem function
 */
export async function updateCatalogItem(
  id: string,
  data: Partial<ServiceCatalogItem>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const res = await updateCatalogItemAction(id, data as any)
  if (!res.success) {
    throw new Error(res.error || 'Error al actualizar item')
  }
  return { success: true, data: res.data }
}

// ------------------------------------------------------------------------------
// 5. DELETE CATALOG ITEM (Soft Delete by Default with Hard Delete Option)
// ------------------------------------------------------------------------------

export async function deleteCatalogItemAction(
  id: string,
  options?: { hardDelete?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No se encontró contexto de organización')

    if (options?.hardDelete) {
      const { error } = await supabase
        .from('service_catalog')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('service_catalog')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false,
          is_visible_in_portal: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId)

      if (error) throw error
    }

    revalidatePath('/portfolio')
    revalidatePath('/dashboard')
    revalidatePath('/portal')
    revalidatePath('/services')

    return { success: true }
  } catch (err: any) {
    console.error('deleteCatalogItemAction error:', err)
    return { success: false, error: err.message || 'Error al eliminar item de catálogo' }
  }
}

/**
 * Legacy deleteCatalogItem function
 */
export async function deleteCatalogItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  return deleteCatalogItemAction(id)
}

// ------------------------------------------------------------------------------
// 6. REORDER CATALOG ITEMS
// ------------------------------------------------------------------------------

export async function reorderCatalogItemsAction(
  items: Array<{ id: string; order_index: number }> | string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No se encontró contexto de organización')

    const reorderPayload: Array<{ id: string; order_index: number }> =
      items.length > 0 && typeof items[0] === 'string'
        ? (items as string[]).map((id, index) => ({ id, order_index: index + 1 }))
        : (items as Array<{ id: string; order_index: number }>)

    // Execute sequential / batch updates
    for (const item of reorderPayload) {
      await supabase
        .from('service_catalog')
        .update({ order_index: item.order_index, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('organization_id', orgId)
    }

    revalidatePath('/portfolio')
    revalidatePath('/portal')
    return { success: true }
  } catch (err: any) {
    console.error('reorderCatalogItemsAction error:', err)
    return { success: false, error: err.message || 'Error al reordenar items' }
  }
}

// ------------------------------------------------------------------------------
// 7. DUPLICATE CATALOG ITEM
// ------------------------------------------------------------------------------

export async function duplicateCatalogItemAction(
  id: string,
  customTitle?: string
): Promise<{ success: boolean; data?: UniversalCatalogItem; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No se encontró contexto de organización')

    const original = await getCatalogItemByIdAction(id)
    if (!original.success || !original.data) {
      throw new Error('Item original no encontrado')
    }

    const item = original.data
    const newTitle = customTitle || `${item.name} (Copia)`
    const newSku = item.sku ? `${item.sku}-COPIA` : null

    // Clone gallery images with fresh IDs
    const clonedGallery = (item.gallery_images || []).map((img, idx) => ({
      ...img,
      id: crypto.randomUUID(),
      order_index: idx,
    }))

    // Clone variants with fresh IDs and null SKUs
    const clonedVariants = (item.variants || []).map((v, idx) => ({
      ...v,
      id: crypto.randomUUID(),
      sku: v.sku ? `${v.sku}-COPIA` : null,
      barcode: null,
      order_index: idx,
    }))

    const createPayload: any = {
      name: newTitle,
      description: item.description || '',
      category: item.category,
      category_id: item.category_id || undefined,
      base_price: item.base_price,
      compare_at_price: item.compare_at_price ?? undefined,
      type: item.type,
      classification: item.classification || 'service',
      frequency: item.frequency || undefined,
      image_url: item.image_url || undefined,
      gallery_images: clonedGallery,
      video_url: item.video_url || undefined,
      sku: newSku,
      barcode: null,
      inventory_quantity: item.inventory_quantity ?? 0,
      stock_quantity: item.stock_quantity ?? item.inventory_quantity ?? 0,
      track_inventory: item.track_inventory ?? false,
      track_stock: item.track_stock ?? item.track_inventory ?? false,
      allow_backorders: item.allow_backorders ?? false,
      low_stock_threshold: item.low_stock_threshold ?? 5,
      has_variants: clonedVariants.length > 0,
      variant_attributes: item.variant_attributes || [],
      variants: clonedVariants,
      variants_config: item.variants_config,
      addon_groups: item.addon_groups || [],
      badges: item.badges as string[],
      featured_badge: item.featured_badge || undefined,
      specifications: item.specifications || {},
      specs_tabs: item.specs_tabs || [],
      seo_title: item.seo_title || undefined,
      seo_description: item.seo_description || undefined,
      seo_metadata: item.seo_metadata || { search_tags: [] },
      classification_metadata: item.classification_metadata,
      physical_details: item.physical_details as any,
      digital_details: item.digital_details as any,
      service_details: item.service_details as any,
      subscription_details: item.subscription_details as any,
      is_visible_in_portal: item.is_visible_in_portal ?? true,
      is_active: item.is_active ?? true,
      cta_type: item.cta_type || 'whatsapp',
      price_label_type: item.price_label_type || 'price',
      metadata: item.metadata || {},
    }

    return createCatalogItemAction(createPayload as any)
  } catch (err: any) {
    console.error('duplicateCatalogItemAction error:', err)
    return { success: false, error: err.message || 'Error al duplicar item' }
  }
}

// ------------------------------------------------------------------------------
// 8. ADJUST INVENTORY
// ------------------------------------------------------------------------------

export async function adjustInventoryAction(
  input: AdjustInventoryInput
): Promise<AdjustInventoryResult> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
      return {
        success: false,
        itemId: input.itemId,
        variantId: input.variantId,
        previousQuantity: 0,
        newQuantity: 0,
        isLowStock: false,
        lowStockThreshold: 5,
        trackInventory: false,
        error: 'No se encontró contexto de organización',
      }
    }

    // 1. Variant Inventory Mutation
    if (input.variantId) {
      const { data: variant, error: varError } = await supabase
        .from('service_catalog_variants')
        .select('*')
        .eq('id', input.variantId)
        .eq('catalog_item_id', input.itemId)
        .eq('organization_id', orgId)
        .single()

      if (varError || !variant) {
        return {
          success: false,
          itemId: input.itemId,
          variantId: input.variantId,
          previousQuantity: 0,
          newQuantity: 0,
          isLowStock: false,
          lowStockThreshold: 5,
          trackInventory: false,
          error: 'Variante no encontrada',
        }
      }

      const { data: parentItem } = await supabase
        .from('service_catalog')
        .select('allow_backorders, low_stock_threshold, track_inventory, variants')
        .eq('id', input.itemId)
        .eq('organization_id', orgId)
        .single()

      const previousQuantity = Number(variant.inventory_quantity ?? 0)
      const trackInventory = Boolean(variant.track_inventory ?? parentItem?.track_inventory ?? false)
      const allowBackorders = Boolean(parentItem?.allow_backorders ?? false)
      const lowStockThreshold = Number(parentItem?.low_stock_threshold ?? 5)

      const newQuantity =
        input.mode === 'set'
          ? Math.floor(input.quantityDelta)
          : previousQuantity + Math.floor(input.quantityDelta)

      if (trackInventory && !allowBackorders && newQuantity < 0) {
        return {
          success: false,
          itemId: input.itemId,
          variantId: input.variantId,
          previousQuantity,
          newQuantity: previousQuantity,
          isLowStock: previousQuantity <= lowStockThreshold,
          lowStockThreshold,
          trackInventory,
          error: 'Inventario insuficiente. No se permiten existencias negativas para esta variante.',
        }
      }

      const safeNewQuantity = trackInventory && !allowBackorders ? Math.max(0, newQuantity) : newQuantity

      // Update variant row
      await supabase
        .from('service_catalog_variants')
        .update({
          inventory_quantity: safeNewQuantity,
          stock_quantity: safeNewQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.variantId)
        .eq('organization_id', orgId)

      // Sync parent variants cache JSONB
      if (parentItem?.variants && Array.isArray(parentItem.variants)) {
        const updatedVariantsJson = parentItem.variants.map((v: any) =>
          v.id === input.variantId
            ? { ...v, inventory_quantity: safeNewQuantity, stock_quantity: safeNewQuantity }
            : v
        )

        await supabase
          .from('service_catalog')
          .update({
            variants: updatedVariantsJson,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.itemId)
          .eq('organization_id', orgId)
      }

      const isLowStock = trackInventory && safeNewQuantity <= lowStockThreshold

      revalidatePath('/portfolio')
      revalidatePath('/portal')

      return {
        success: true,
        itemId: input.itemId,
        variantId: input.variantId,
        previousQuantity,
        newQuantity: safeNewQuantity,
        isLowStock,
        lowStockThreshold,
        trackInventory,
      }
    }

    // 2. Main Item Inventory Mutation
    const { data: item, error: itemError } = await supabase
      .from('service_catalog')
      .select('inventory_quantity, track_inventory, allow_backorders, low_stock_threshold')
      .eq('id', input.itemId)
      .eq('organization_id', orgId)
      .single()

    if (itemError || !item) {
      return {
        success: false,
        itemId: input.itemId,
        previousQuantity: 0,
        newQuantity: 0,
        isLowStock: false,
        lowStockThreshold: 5,
        trackInventory: false,
        error: 'Item no encontrado',
      }
    }

    const previousQuantity = Number(item.inventory_quantity ?? 0)
    const trackInventory = Boolean(item.track_inventory ?? false)
    const allowBackorders = Boolean(item.allow_backorders ?? false)
    const lowStockThreshold = Number(item.low_stock_threshold ?? 5)

    const newQuantity =
      input.mode === 'set'
        ? Math.floor(input.quantityDelta)
        : previousQuantity + Math.floor(input.quantityDelta)

    if (trackInventory && !allowBackorders && newQuantity < 0) {
      return {
        success: false,
        itemId: input.itemId,
        previousQuantity,
        newQuantity: previousQuantity,
        isLowStock: previousQuantity <= lowStockThreshold,
        lowStockThreshold,
        trackInventory,
        error: 'Inventario insuficiente. No se permiten compras sin existencias disponibles.',
      }
    }

    const safeNewQuantity = trackInventory && !allowBackorders ? Math.max(0, newQuantity) : newQuantity

    await supabase
      .from('service_catalog')
      .update({
        inventory_quantity: safeNewQuantity,
        stock_quantity: safeNewQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.itemId)
      .eq('organization_id', orgId)

    const isLowStock = trackInventory && safeNewQuantity <= lowStockThreshold

    revalidatePath('/portfolio')
    revalidatePath('/portal')

    return {
      success: true,
      itemId: input.itemId,
      previousQuantity,
      newQuantity: safeNewQuantity,
      isLowStock,
      lowStockThreshold,
      trackInventory,
    }
  } catch (err: any) {
    console.error('adjustInventoryAction error:', err)
    return {
      success: false,
      itemId: input.itemId,
      variantId: input.variantId,
      previousQuantity: 0,
      newQuantity: 0,
      isLowStock: false,
      lowStockThreshold: 5,
      trackInventory: false,
      error: err.message || 'Error al ajustar inventario',
    }
  }
}

// ------------------------------------------------------------------------------
// 9. ATOMIC STOCK ACTIONS (DECREMENT, RESTORE, REAL-TIME UPDATE)
// ------------------------------------------------------------------------------

/**
 * Atomic multi-item stock decrement server action.
 * Attempts Supabase RPC 'decrement_catalog_stock' first; falls back to transactional Node.js mutation.
 */
export async function decrementStockAction(
  paramsOrItems: DecrementStockParams | DecrementStockItemInput[] | { organizationId?: string; items: DecrementStockItemInput[] },
  options?: { organizationId?: string }
): Promise<DecrementStockResult> {
  try {
    const supabase = await createClient()

    let rawItems: DecrementStockItemInput[] = []
    let passedOrgId: string | undefined

    if (Array.isArray(paramsOrItems)) {
      rawItems = paramsOrItems
      passedOrgId = options?.organizationId
    } else if (paramsOrItems && typeof paramsOrItems === 'object') {
      rawItems = paramsOrItems.items || []
      passedOrgId = (paramsOrItems as any).organizationId || options?.organizationId
    }

    const orgId = passedOrgId || (await getCurrentOrganizationId())
    if (!orgId) {
      return { success: false, error: 'No se encontró contexto de organización' }
    }

    if (!rawItems || rawItems.length === 0) {
      return { success: true, decrementedItems: [], updatedItems: [] }
    }

    // Prepare RPC payload
    const rpcPayload = rawItems.map((i) => ({
      item_id: i.catalogItemId || i.itemId || i.item_id,
      variant_id: i.variantId || i.variant_id || null,
      quantity: Math.max(1, Math.floor(i.quantity)),
      allow_backorders_override: i.allowBackordersOverride ?? i.allow_backorders_override ?? false,
    }))

    let rpcSuccess = false
    let decrementedResult: DecrementStockItemResult[] = []

    try {
      const { data, error } = await supabase.rpc('decrement_catalog_stock', {
        p_organization_id: orgId,
        p_items: rpcPayload,
      })

      if (!error && data?.success) {
        rpcSuccess = true
        decrementedResult = (data.decremented_items || []).map((di: any) => ({
          itemId: di.item_id || di.catalog_item_id,
          catalogItemId: di.catalog_item_id || di.item_id,
          variantId: di.variant_id || null,
          previousStock: di.previous_stock ?? 0,
          newStock: di.new_stock ?? 0,
          decrementedQuantity: di.decremented_quantity ?? 1,
          trackInventory: di.track_inventory ?? true,
        }))
      } else if (error) {
        if (
          error.message &&
          (error.message.includes('ERR_INSUFFICIENT_STOCK') ||
            error.message.includes('ERR_VARIANT_NOT_FOUND') ||
            error.message.includes('ERR_ITEM_NOT_FOUND'))
        ) {
          return { success: false, error: error.message }
        }
        console.warn('RPC decrement_catalog_stock failed, engaging Node.js fallback:', error.message)
      }
    } catch (rpcErr: any) {
      if (rpcErr.message && rpcErr.message.includes('ERR_INSUFFICIENT_STOCK')) {
        return { success: false, error: rpcErr.message }
      }
      console.warn('RPC decrement_catalog_stock error, engaging Node.js fallback:', rpcErr)
    }

    // Node.js fallback if RPC not executed
    if (!rpcSuccess) {
      for (const item of rawItems) {
        const itemId = item.catalogItemId || item.itemId || item.item_id
        if (!itemId) throw new Error('ID de producto no especificado')
        const variantId = item.variantId || item.variant_id || null
        const reqQty = Math.max(1, Math.floor(item.quantity))
        const allowBackordersOverride = item.allowBackordersOverride ?? item.allow_backorders_override ?? false

        if (variantId) {
          const { data: variant, error: varError } = await supabase
            .from('service_catalog_variants')
            .select('*')
            .eq('id', variantId)
            .eq('catalog_item_id', itemId)
            .eq('organization_id', orgId)
            .single()

          if (varError || !variant) throw new Error(`Variante con ID ${variantId} no encontrada`)

          const { data: parentItem } = await supabase
            .from('service_catalog')
            .select('name, track_inventory, allow_backorders, variants')
            .eq('id', itemId)
            .eq('organization_id', orgId)
            .single()

          const trackInventory = Boolean(
            variant.track_inventory ?? variant.track_stock ?? parentItem?.track_inventory ?? false
          )
          const allowBackorders = allowBackordersOverride || Boolean(parentItem?.allow_backorders ?? false)
          const currentStock = Number(variant.inventory_quantity ?? variant.stock_quantity ?? 0)

          if (trackInventory && !allowBackorders && currentStock < reqQty) {
            return {
              success: false,
              error: `Stock insuficiente para "${parentItem?.name || 'Producto'}" (${variant.name || 'Variante'}). Disponibles: ${currentStock}, Solicitadas: ${reqQty}.`,
            }
          }

          let newStock = currentStock - reqQty
          if (trackInventory && !allowBackorders && newStock < 0) {
            newStock = 0
          }

          await supabase
            .from('service_catalog_variants')
            .update({
              inventory_quantity: newStock,
            })
            .eq('id', variantId)
            .eq('organization_id', orgId)

          if (parentItem?.variants && Array.isArray(parentItem.variants)) {
            const updatedVariantsJson = parentItem.variants.map((v: any) =>
              v.id === variantId ? { ...v, inventory_quantity: newStock, stock_quantity: newStock } : v
            )
            await supabase
              .from('service_catalog')
              .update({ variants: updatedVariantsJson })
              .eq('id', itemId)
              .eq('organization_id', orgId)
          }

          decrementedResult.push({
            itemId,
            catalogItemId: itemId,
            variantId,
            previousStock: currentStock,
            newStock,
            decrementedQuantity: reqQty,
            trackInventory,
          })
        } else {
          const { data: catItem, error: itemError } = await supabase
            .from('service_catalog')
            .select('*')
            .eq('id', itemId)
            .eq('organization_id', orgId)
            .single()

          if (itemError || !catItem) throw new Error(`Item con ID ${itemId} no encontrado`)

          const trackInventory = Boolean(catItem.track_inventory ?? catItem.track_stock ?? false)
          const allowBackorders = allowBackordersOverride || Boolean(catItem.allow_backorders ?? false)
          const currentStock = Number(catItem.inventory_quantity ?? catItem.stock_quantity ?? 0)

          if (trackInventory && !allowBackorders && currentStock < reqQty) {
            return {
              success: false,
              error: `Stock insuficiente para "${catItem.name}". Disponibles: ${currentStock}, Solicitadas: ${reqQty}.`,
            }
          }

          let newStock = currentStock - reqQty
          if (trackInventory && !allowBackorders && newStock < 0) {
            newStock = 0
          }

          await supabase
            .from('service_catalog')
            .update({
              inventory_quantity: newStock,
            })
            .eq('id', itemId)
            .eq('organization_id', orgId)

          decrementedResult.push({
            itemId,
            catalogItemId: itemId,
            variantId: null,
            previousStock: currentStock,
            newStock,
            decrementedQuantity: reqQty,
            trackInventory,
          })
        }
      }
    }

    revalidatePath('/portfolio')
    revalidatePath('/portal')
    revalidatePath('/services')

    return {
      success: true,
      decrementedItems: decrementedResult,
      updatedItems: decrementedResult,
    }
  } catch (err: any) {
    console.error('decrementStockAction error:', err)
    return { success: false, error: err.message || 'Error al descontar stock' }
  }
}

/**
 * Atomic multi-item stock restoration server action.
 * Attempts Supabase RPC 'restore_catalog_stock' first; falls back to transactional Node.js mutation.
 */
export async function restoreStockAction(
  paramsOrItems: RestoreStockParams | RestoreStockItemInput[] | { organizationId?: string; items: RestoreStockItemInput[] },
  options?: { organizationId?: string }
): Promise<RestoreStockResult> {
  try {
    const supabase = await createClient()

    let rawItems: RestoreStockItemInput[] = []
    let passedOrgId: string | undefined

    if (Array.isArray(paramsOrItems)) {
      rawItems = paramsOrItems
      passedOrgId = options?.organizationId
    } else if (paramsOrItems && typeof paramsOrItems === 'object') {
      rawItems = paramsOrItems.items || []
      passedOrgId = (paramsOrItems as any).organizationId || options?.organizationId
    }

    const orgId = passedOrgId || (await getCurrentOrganizationId())
    if (!orgId) {
      return { success: false, error: 'No se encontró contexto de organización' }
    }

    if (!rawItems || rawItems.length === 0) {
      return { success: true, restoredItems: [] }
    }

    const rpcPayload = rawItems.map((i) => ({
      item_id: i.catalogItemId || i.itemId || i.item_id,
      variant_id: i.variantId || i.variant_id || null,
      quantity: Math.max(1, Math.floor(i.quantity)),
    }))

    let rpcSuccess = false
    let restoredResult: RestoreStockItemResult[] = []

    try {
      const { data, error } = await supabase.rpc('restore_catalog_stock', {
        p_organization_id: orgId,
        p_items: rpcPayload,
      })

      if (!error && data?.success) {
        rpcSuccess = true
        restoredResult = (data.restored_items || []).map((ri: any) => ({
          itemId: ri.item_id || ri.catalog_item_id,
          catalogItemId: ri.catalog_item_id || ri.item_id,
          variantId: ri.variant_id || null,
          previousStock: ri.previous_stock ?? 0,
          newStock: ri.new_stock ?? 0,
          restoredQuantity: ri.restored_quantity ?? 1,
        }))
      } else if (error) {
        console.warn('RPC restore_catalog_stock failed, engaging Node.js fallback:', error.message)
      }
    } catch (rpcErr: any) {
      console.warn('RPC restore_catalog_stock error, engaging Node.js fallback:', rpcErr)
    }

    // Node.js fallback
    if (!rpcSuccess) {
      for (const item of rawItems) {
        const itemId = item.catalogItemId || item.itemId || item.item_id
        if (!itemId) continue
        const variantId = item.variantId || item.variant_id || null
        const reqQty = Math.max(1, Math.floor(item.quantity))

        if (variantId) {
          const { data: variant } = await supabase
            .from('service_catalog_variants')
            .select('*')
            .eq('id', variantId)
            .eq('catalog_item_id', itemId)
            .eq('organization_id', orgId)
            .single()

          if (variant) {
            const currentStock = Number(variant.inventory_quantity ?? variant.stock_quantity ?? 0)
            const newStock = currentStock + reqQty

            await supabase
              .from('service_catalog_variants')
              .update({
                inventory_quantity: newStock,
              })
              .eq('id', variantId)
              .eq('organization_id', orgId)

            const { data: parentItem } = await supabase
              .from('service_catalog')
              .select('variants')
              .eq('id', itemId)
              .eq('organization_id', orgId)
              .single()

            if (parentItem?.variants && Array.isArray(parentItem.variants)) {
              const updatedVariantsJson = parentItem.variants.map((v: any) =>
                v.id === variantId ? { ...v, inventory_quantity: newStock, stock_quantity: newStock } : v
              )
              await supabase
                .from('service_catalog')
                .update({ variants: updatedVariantsJson })
                .eq('id', itemId)
                .eq('organization_id', orgId)
            }

            restoredResult.push({
              itemId,
              catalogItemId: itemId,
              variantId,
              previousStock: currentStock,
              newStock,
              restoredQuantity: reqQty,
            })
          }
        } else {
          const { data: catItem } = await supabase
            .from('service_catalog')
            .select('*')
            .eq('id', itemId)
            .eq('organization_id', orgId)
            .single()

          if (catItem) {
            const currentStock = Number(catItem.inventory_quantity ?? catItem.stock_quantity ?? 0)
            const newStock = currentStock + reqQty

            await supabase
              .from('service_catalog')
              .update({
                inventory_quantity: newStock,
              })
              .eq('id', itemId)
              .eq('organization_id', orgId)

            restoredResult.push({
              itemId,
              catalogItemId: itemId,
              variantId: null,
              previousStock: currentStock,
              newStock,
              restoredQuantity: reqQty,
            })
          }
        }
      }
    }

    revalidatePath('/portfolio')
    revalidatePath('/portal')
    revalidatePath('/services')

    return {
      success: true,
      restoredItems: restoredResult,
    }
  } catch (err: any) {
    console.error('restoreStockAction error:', err)
    return { success: false, error: err.message || 'Error al restaurar stock' }
  }
}

/**
 * Real-time stock and inventory configuration action for Admin Workspace.
 */
export async function updateItemStockAction(
  input: UpdateItemStockInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = input.organizationId || (await getCurrentOrganizationId())
    if (!orgId) throw new Error('No se encontró contexto de organización')

    const itemId = input.catalogItemId || input.itemId
    if (!itemId) throw new Error('ID de producto no especificado')

    const targetQty = input.stockQuantity ?? input.quantity ?? 0
    const mode = input.mode || 'set'

    if (input.variantId) {
      const { data: variant, error: varError } = await supabase
        .from('service_catalog_variants')
        .select('*')
        .eq('id', input.variantId)
        .eq('catalog_item_id', itemId)
        .eq('organization_id', orgId)
        .single()

      if (varError || !variant) throw new Error('Variante no encontrada')

      const prevQty = Number(variant.inventory_quantity ?? variant.stock_quantity ?? 0)
      const calculatedQty =
        mode === 'set'
          ? Math.max(0, Math.floor(targetQty))
          : Math.max(0, prevQty + Math.floor(targetQty))

      const updateFields: any = {
        inventory_quantity: calculatedQty,
      }

      if (input.trackInventory !== undefined) {
        updateFields.track_inventory = input.trackInventory
      }
      if (input.allowBackorders !== undefined) {
        updateFields.allow_backorders = input.allowBackorders
      }
      if (input.lowStockThreshold !== undefined) {
        updateFields.low_stock_threshold = input.lowStockThreshold
      }
      if (input.sku !== undefined) updateFields.sku = input.sku
      if (input.barcode !== undefined) updateFields.barcode = input.barcode

      const { error: updateError } = await supabase
        .from('service_catalog_variants')
        .update(updateFields)
        .eq('id', input.variantId)
        .eq('organization_id', orgId)

      if (updateError) throw updateError

      // Refresh parent variants JSONB array
      const { data: allVariants } = await supabase
        .from('service_catalog_variants')
        .select('*')
        .eq('catalog_item_id', itemId)
        .eq('organization_id', orgId)
        .order('order_index', { ascending: true })

      await supabase
        .from('service_catalog')
        .update({ variants: allVariants || [] })
        .eq('id', itemId)
        .eq('organization_id', orgId)

      revalidatePath('/portfolio')
      revalidatePath('/portal')

      return {
        success: true,
        data: {
          itemId,
          variantId: input.variantId,
          previousQuantity: prevQty,
          newQuantity: calculatedQty,
          trackInventory: updateFields.track_inventory ?? variant.track_inventory,
        },
      }
    } else {
      // Parent item inventory
      const { data: item, error: itemError } = await supabase
        .from('service_catalog')
        .select('*')
        .eq('id', itemId)
        .eq('organization_id', orgId)
        .single()

      if (itemError || !item) throw new Error('Item no encontrado')

      const prevQty = Number(item.inventory_quantity ?? item.stock_quantity ?? 0)
      const calculatedQty =
        mode === 'set'
          ? Math.max(0, Math.floor(targetQty))
          : Math.max(0, prevQty + Math.floor(targetQty))

      const updateFields: any = {
        inventory_quantity: calculatedQty,
      }

      if (input.trackInventory !== undefined) {
        updateFields.track_inventory = input.trackInventory
      }
      if (input.allowBackorders !== undefined) updateFields.allow_backorders = input.allowBackorders
      if (input.lowStockThreshold !== undefined) updateFields.low_stock_threshold = input.lowStockThreshold
      if (input.sku !== undefined) updateFields.sku = input.sku
      if (input.barcode !== undefined) updateFields.barcode = input.barcode

      const { error: updateError } = await supabase
        .from('service_catalog')
        .update(updateFields)
        .eq('id', itemId)
        .eq('organization_id', orgId)

      if (updateError) throw updateError

      revalidatePath('/portfolio')
      revalidatePath('/portal')

      return {
        success: true,
        data: {
          itemId,
          previousQuantity: prevQty,
          newQuantity: calculatedQty,
          trackInventory: updateFields.track_inventory ?? item.track_inventory,
        },
      }
    }
  } catch (err: any) {
    console.error('updateItemStockAction error:', err)
    return { success: false, error: err.message || 'Error al actualizar stock' }
  }
}

// ------------------------------------------------------------------------------
// 10. TEMPLATE SEEDING & APP DATA ACTIONS (Legacy Compat)
// ------------------------------------------------------------------------------

export async function seedCatalogFromTemplate(templateId: string) {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()
  if (!orgId) throw new Error('No org')

  const template = CATALOG_TEMPLATES.find((t) => t.id === templateId)
  if (!template) throw new Error('Template not found')

  const itemsToInsert = template.items.map((item, idx) => ({
    ...item,
    organization_id: orgId,
    order_index: idx,
    is_active: true,
    is_visible_in_portal: true,
  }))

  const { error } = await supabase
    .from('service_catalog')
    .insert(itemsToInsert as any)

  if (error) throw error
  revalidatePath('/portfolio')
  revalidatePath('/dashboard')
  return { success: true, count: itemsToInsert.length }
}

export async function getSubscriptionApp(): Promise<SaasApp | null> {
  const currentApp = await getCurrentOrganizationApp()
  if (currentApp?.app) {
    return currentApp.app
  }
  return null
}
