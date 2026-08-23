import {
  UniversalCatalogItem,
  CatalogClassification,
  CatalogGalleryImage,
} from "@/types/catalog"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Normalizes raw database service_catalog rows into standard UniversalCatalogItem
 */
export function normalizeCatalogItem(
  row: any,
  categoryMap: Record<string, string> = {}
): UniversalCatalogItem {
  if (!row) return {} as UniversalCatalogItem

  // 1. Category Resolution
  let categoryName = row.category || 'General'
  let categoryId = row.category_id || null

  if (UUID_REGEX.test(categoryName)) {
    categoryId = categoryName
    categoryName = categoryMap[categoryName] || 'General'
  } else if (!categoryId && row.category && categoryMap[row.category]) {
    categoryId = row.category_id || null
  }

  // 2. Gallery Images & Cover Photo Resolution
  let galleryImages: CatalogGalleryImage[] = Array.isArray(row.gallery_images) && row.gallery_images.length > 0
    ? row.gallery_images
    : Array.isArray(row.metadata?.gallery_images) && row.metadata.gallery_images.length > 0
    ? row.metadata.gallery_images
    : Array.isArray(row.images) && row.images.length > 0
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
    } else if (row.type === 'real_estate' || row.type === 'property' || row.type === 'inmueble') {
      classification = 'real_estate'
    } else {
      classification = 'service'
    }
  }

  // Automatic real estate classification fallback if item contains real estate data or category
  const catLower = categoryName.toLowerCase()
  const isReCategoryOrData = Boolean(
    row.real_estate_details ||
    row.classification_metadata?.real_estate ||
    row.metadata?.real_estate_details ||
    row.metadata?.classification_metadata?.real_estate ||
    catLower.includes('inmueble') ||
    catLower.includes('propiedad') ||
    catLower.includes('bienes raíces') ||
    catLower.includes('bienes raices') ||
    catLower.includes('apartamento') ||
    catLower.includes('casa')
  )

  if (isReCategoryOrData && (!row.classification || row.classification === 'service' || row.classification === 'physical')) {
    classification = 'real_estate'
  }

  // 4. Badges Normalization
  const rawBadges = Array.isArray(row.badges) && row.badges.length > 0
    ? row.badges
    : Array.isArray(row.metadata?.badges)
    ? row.metadata.badges
    : []
  const badges = rawBadges.map((b: any) => (typeof b === 'string' ? b : b.label || b.id || ''))
  const structuredBadges = Array.isArray(row.structured_badges)
    ? row.structured_badges
    : rawBadges.filter((b: any) => typeof b === 'object' && b !== null)

  // 5. Metadata and UI types
  const metadata = row.metadata || {}
  const ctaType = row.cta_type || metadata.cta_type || 'whatsapp'
  const priceLabelType = row.price_label_type || metadata.price_label_type || 'price'

    const classMeta =
      row.classification_metadata && Object.keys(row.classification_metadata).length > 0
        ? row.classification_metadata
        : metadata.classification_metadata || {}

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
      featured_badge: row.featured_badge || metadata.featured_badge || null,
      specifications: (row.specifications && Object.keys(row.specifications).length > 0) ? row.specifications : metadata.specifications || {},
      specs_tabs: Array.isArray(row.specs_tabs) && row.specs_tabs.length > 0 ? row.specs_tabs : Array.isArray(metadata.specs_tabs) ? metadata.specs_tabs : [],
      spec_tabs: row.spec_tabs || metadata.spec_tabs || {},
      seo_title: row.seo_title || metadata.seo_metadata?.meta_title || null,
      seo_description: row.seo_description || metadata.seo_metadata?.meta_description || null,
      seo_metadata: row.seo_metadata || metadata.seo_metadata || { search_tags: [] },
      classification_metadata: classMeta,
      physical_details: classification === "physical" ? (row.physical_details || classMeta.physical || metadata.physical_details) : undefined,
      digital_details: classification === "digital" ? (row.digital_details || classMeta.digital || metadata.digital_details) : undefined,
      service_details: classification === "service" ? (row.service_details || classMeta.service || metadata.service_details) : undefined,
      subscription_details: classification === "subscription" ? (row.subscription_details || classMeta.subscription || metadata.subscription_details) : undefined,
      real_estate_details: (classification === "real_estate" || isReCategoryOrData) ? (row.real_estate_details || classMeta.real_estate || metadata.real_estate_details || metadata.classification_metadata?.real_estate) : undefined,
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
