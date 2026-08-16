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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ------------------------------------------------------------------------------
// HELPER: Normalize Universal Catalog Item
// ------------------------------------------------------------------------------

function normalizeCatalogItem(
  row: any,
  categoryMap: Record<string, string> = {}
): UniversalCatalogItem {
  // 1. Category Resolution
  let categoryName = row.category || 'General'
  let categoryId = row.category_id || null

  if (UUID_REGEX.test(categoryName)) {
    categoryId = categoryName
    categoryName = categoryMap[categoryName] || 'General'
  } else if (!categoryId && row.category && categoryMap[row.category]) {
    // If row.category is a name, check if mapped
    categoryId = row.category_id || null
  }

  // 2. Gallery Images & Cover Photo Resolution
  let galleryImages: CatalogGalleryImage[] = Array.isArray(row.gallery_images)
    ? row.gallery_images
    : Array.isArray(row.images)
    ? row.images
    : []

  if (galleryImages.length === 0 && row.image_url) {
    galleryImages = [
      {
        id: 'cover-0',
        url: row.image_url,
        is_cover: true,
        order_index: 0,
        alt_text: row.name,
      },
    ]
  }

  // Ensure cover photo exists
  const hasCover = galleryImages.some((img) => img.is_cover)
  if (!hasCover && galleryImages.length > 0) {
    galleryImages = galleryImages.map((img, idx) => ({
      ...img,
      is_cover: idx === 0,
    }))
  }

  const coverImg = galleryImages.find((img) => img.is_cover)
  const coverUrl = coverImg?.url || galleryImages[0]?.url || row.image_url || null

  // 3. Classification Resolution
  let classification: CatalogClassification = row.classification || 'service'
  if (!row.classification && row.type) {
    if (row.type === 'product' || row.type === 'physical') {
      classification = 'physical'
    } else if (row.type === 'recurring' || row.type === 'subscription') {
      classification = 'subscription'
    } else if (row.type === 'digital') {
      classification = 'digital'
    } else {
      classification = 'service'
    }
  }

  // 4. Badges Normalization
  const rawBadges = Array.isArray(row.badges) ? row.badges : []
  const badges = rawBadges.map((b: any) => (typeof b === 'string' ? b : b.label || b.id || ''))
  const structuredBadges = Array.isArray(row.structured_badges)
    ? row.structured_badges
    : rawBadges.filter((b: any) => typeof b === 'object' && b !== null)

  // 5. Metadata and UI types
  const metadata = row.metadata || {}
  const ctaType = row.cta_type || metadata.cta_type || 'whatsapp'
  const priceLabelType = row.price_label_type || metadata.price_label_type || 'price'

  return {
    id: row.id,
    organization_id: row.organization_id,
    name: row.name || '',
    description: row.description || '',
    category: categoryName,
    category_id: categoryId,
    base_price: Number(row.base_price || 0),
    compare_at_price:
      row.compare_at_price !== null && row.compare_at_price !== undefined
        ? Number(row.compare_at_price)
        : null,
    type: row.type || 'one_off',
    classification,
    frequency: row.frequency || null,
    image_url: coverUrl,
    gallery_images: galleryImages,
    images: galleryImages,
    video_url: row.video_url || null,
    sku: row.sku || null,
    barcode: row.barcode || null,
    inventory_quantity: Number(row.inventory_quantity ?? row.stock_quantity ?? 0),
    stock_quantity: Number(row.stock_quantity ?? row.inventory_quantity ?? 0),
    track_inventory: Boolean(row.track_inventory ?? row.track_stock ?? false),
    track_stock: Boolean(row.track_stock ?? row.track_inventory ?? false),
    allow_backorders: Boolean(row.allow_backorders ?? false),
    low_stock_threshold: Number(row.low_stock_threshold ?? 5),
    has_variants: Boolean(row.has_variants ?? (Array.isArray(row.variants) && row.variants.length > 0)),
    variant_attributes: Array.isArray(row.variant_attributes) ? row.variant_attributes : [],
    variants: Array.isArray(row.variants) ? row.variants : [],
    variants_config: row.variants_config || { attributes: [] },
    addon_groups: Array.isArray(row.addon_groups)
      ? row.addon_groups
      : Array.isArray(row.add_ons)
      ? row.add_ons
      : [],
    add_ons: Array.isArray(row.add_ons)
      ? row.add_ons
      : Array.isArray(row.addon_groups)
      ? row.addon_groups
      : [],
    badges,
    structured_badges: structuredBadges,
    featured_badge: row.featured_badge || null,
    specifications: row.specifications || {},
    specs_tabs: Array.isArray(row.specs_tabs) ? row.specs_tabs : [],
    spec_tabs: row.spec_tabs || {},
    seo_title: row.seo_title || null,
    seo_description: row.seo_description || null,
    seo_metadata: row.seo_metadata || { search_tags: [] },
    classification_metadata: row.classification_metadata || {},
    physical_details: row.physical_details || row.classification_metadata?.physical,
    digital_details: row.digital_details || row.classification_metadata?.digital,
    service_details: row.service_details || row.classification_metadata?.service,
    subscription_details: row.subscription_details || row.classification_metadata?.subscription,
    is_visible_in_portal: Boolean(row.is_visible_in_portal ?? true),
    is_active: Boolean(row.is_active ?? true),
    order_index: row.order_index ?? 0,
    cta_type: ctaType,
    price_label_type: priceLabelType,
    is_system_template: row.is_system_template ?? null,
    ai_generated_image: row.ai_generated_image ?? null,
    insights_access: row.insights_access ?? null,
    service_start_date: row.service_start_date ?? null,
    billing_cycle_start_date: row.billing_cycle_start_date ?? null,
    briefing_template_id: row.briefing_template_id ?? null,
    metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null,
  }
}

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
      images: galleryImages,
      video_url: validated.video_url || null,
      sku: validated.sku || null,
      barcode: validated.barcode || null,
      inventory_quantity: validated.inventory_quantity ?? 0,
      stock_quantity: validated.stock_quantity ?? validated.inventory_quantity ?? 0,
      track_inventory: validated.track_inventory ?? false,
      track_stock: validated.track_stock ?? validated.track_inventory ?? false,
      allow_backorders: validated.allow_backorders ?? false,
      low_stock_threshold: validated.low_stock_threshold ?? 5,
      has_variants: validated.has_variants || (validated.variants && validated.variants.length > 0),
      variant_attributes: validated.variant_attributes || [],
      variants: validated.variants || [],
      variants_config: validated.variants_config || { attributes: validated.variant_attributes || [] },
      addon_groups: validated.addon_groups || [],
      add_ons: validated.addon_groups || [],
      badges: validated.badges || [],
      featured_badge: validated.featured_badge || null,
      specifications: validated.specifications || {},
      specs_tabs: validated.specs_tabs || [],
      spec_tabs: validated.spec_tabs || {},
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
        stock_quantity: v.stock_quantity ?? v.inventory_quantity ?? 0,
        track_inventory: v.track_inventory ?? false,
        track_stock: v.track_stock ?? v.track_inventory ?? false,
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
    const safeMetadata = {
      ...(existingItem.metadata || {}),
      ...(validated.metadata || {}),
      ...(validated.cta_type ? { cta_type: validated.cta_type } : {}),
      ...(validated.price_label_type ? { price_label_type: validated.price_label_type } : {}),
    }

    const classificationMetadata = {
      ...(existingItem.classification_metadata || {}),
      ...(validated.classification_metadata || {}),
      ...(validated.physical_details ? { physical: validated.physical_details } : {}),
      ...(validated.digital_details ? { digital: validated.digital_details } : {}),
      ...(validated.service_details ? { service: validated.service_details } : {}),
      ...(validated.subscription_details ? { subscription: validated.subscription_details } : {}),
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
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
      updatePayload.images = galleryImages
    }
    if (validated.video_url !== undefined) updatePayload.video_url = validated.video_url
    if (validated.sku !== undefined) updatePayload.sku = validated.sku
    if (validated.barcode !== undefined) updatePayload.barcode = validated.barcode
    if (validated.inventory_quantity !== undefined) {
      updatePayload.inventory_quantity = validated.inventory_quantity
      updatePayload.stock_quantity = validated.inventory_quantity
    }
    if (validated.track_inventory !== undefined) {
      updatePayload.track_inventory = validated.track_inventory
      updatePayload.track_stock = validated.track_inventory
    }
    if (validated.allow_backorders !== undefined) updatePayload.allow_backorders = validated.allow_backorders
    if (validated.low_stock_threshold !== undefined) updatePayload.low_stock_threshold = validated.low_stock_threshold
    if (validated.has_variants !== undefined) updatePayload.has_variants = validated.has_variants
    if (validated.variant_attributes !== undefined) updatePayload.variant_attributes = validated.variant_attributes
    if (validated.variants !== undefined) updatePayload.variants = validated.variants
    if (validated.variants_config !== undefined) updatePayload.variants_config = validated.variants_config
    if (validated.addon_groups !== undefined) {
      updatePayload.addon_groups = validated.addon_groups
      updatePayload.add_ons = validated.addon_groups
    }
    if (validated.badges !== undefined) updatePayload.badges = validated.badges
    if (validated.featured_badge !== undefined) updatePayload.featured_badge = validated.featured_badge
    if (validated.specifications !== undefined) updatePayload.specifications = validated.specifications
    if (validated.specs_tabs !== undefined) updatePayload.specs_tabs = validated.specs_tabs
    if (validated.spec_tabs !== undefined) updatePayload.spec_tabs = validated.spec_tabs
    if (validated.seo_title !== undefined) updatePayload.seo_title = validated.seo_title
    if (validated.seo_description !== undefined) updatePayload.seo_description = validated.seo_description
    if (validated.seo_metadata !== undefined) updatePayload.seo_metadata = validated.seo_metadata
    if (validated.classification_metadata !== undefined || validated.physical_details || validated.digital_details || validated.service_details || validated.subscription_details) {
      updatePayload.classification_metadata = classificationMetadata
    }
    if (validated.physical_details !== undefined) updatePayload.physical_details = validated.physical_details
    if (validated.digital_details !== undefined) updatePayload.digital_details = validated.digital_details
    if (validated.service_details !== undefined) updatePayload.service_details = validated.service_details
    if (validated.subscription_details !== undefined) updatePayload.subscription_details = validated.subscription_details
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
// 9. TEMPLATE SEEDING & APP DATA ACTIONS (Legacy Compat)
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
