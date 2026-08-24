// ==============================================================================
// PIXY UNIVERSAL MULTI-INDUSTRY CATALOG & STOREFRONT PORTAL TYPES
// File: src/types/catalog.ts
// 100% Backwards-Compatible with Legacy Quotes, Invoices, Contracts, Briefings, & CRM
// ==============================================================================

/**
 * Universal Item Classifications
 */
export type CatalogClassification = 'physical' | 'digital' | 'service' | 'subscription' | 'real_estate';
export type ItemClassification = CatalogClassification; // Direct alias

/**
 * Multi-Photo Gallery Image
 */
export interface CatalogGalleryImage {
  id: string;
  url: string;
  is_cover: boolean;
  order_index: number;
  alt?: string;
  alt_text?: string; // Alias for convenience
  width?: number;
  height?: number;
  file_size_bytes?: number;
  blurhash?: string;
}
export type CatalogItemImage = CatalogGalleryImage; // Direct alias

/**
 * Swatch Display Types for Attributes
 */
export type AttributeSwatchType = 'color' | 'image' | 'pill' | 'select' | 'color_swatch' | 'image_swatch' | 'pills' | 'radio';

/**
 * Reusable Attribute Option Definition
 */
export interface CatalogAttributeOption {
  id: string;
  label: string;
  value: string;
  swatch_type?: AttributeSwatchType;
  swatch_value?: string; // Hex code or image URL
  hex_color?: string;    // Direct hex color alias
  image_url?: string;    // Direct image URL alias
  price_modifier?: number;
  order_index: number;
}
export type AttributeOption = CatalogAttributeOption; // Direct alias

/**
 * Reusable Attribute Group / Definition
 */
export interface CatalogAttributeGroup {
  id: string;
  organization_id?: string;
  name: string;          // e.g. "Color", "Talla", "Material", "Tipo de Licencia"
  slug: string;          // e.g. "color", "size", "material"
  swatch_type?: AttributeSwatchType;
  display_type?: AttributeSwatchType;
  type?: AttributeSwatchType;
  options: CatalogAttributeOption[];
  order_index?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}
export type ReusableAttribute = CatalogAttributeGroup; // Direct alias
export type CatalogAttributeDefinition = CatalogAttributeGroup; // Direct alias

export type CatalogPriceModifierType = 'fixed' | 'offset' | 'percentage' | 'absolute' | 'offset_fixed' | 'offset_percentage';

/**
 * Item Variant Matrix Model
 */
export interface CatalogVariant {
  id: string;
  organization_id?: string;
  catalog_item_id?: string;
  title: string;
  name?: string; // Alias for title
  sku?: string | null;
  barcode?: string | null;
  price_modifier: number; // Offset or absolute price
  price_type?: 'fixed' | 'offset' | 'percentage' | 'absolute' | 'offset_fixed' | 'offset_percentage';
  price_modifier_type?: 'fixed' | 'offset' | 'percentage' | 'absolute' | 'offset_fixed' | 'offset_percentage';
  price_override?: number | null;
  price?: number; // Calculated effective price
  compare_at_price?: number | null;
  inventory_quantity?: number | null;
  stock_quantity?: number | null; // Alias for inventory_quantity
  track_inventory?: boolean;
  track_stock?: boolean; // Alias for track_inventory
  allow_backorders?: boolean;
  low_stock_threshold?: number;
  cta_type?: 'whatsapp' | 'buy' | 'info' | 'quote' | 'appointment' | 'portfolio' | 'add_to_cart' | 'cart' | 'booking';
  price_label_type?: 'price' | 'base_price' | 'from';
  image_url?: string | null;
  attributes: Record<string, string | { name: string; value: string; label?: string }>; // e.g. { "Color": "Negro", "Talla": "L" }
  is_default?: boolean;
  is_active: boolean;
  order_index?: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Dynamic Add-on / Upsell Option
 */
export interface CatalogAddonOption {
  id: string;
  name: string;
  description?: string | null;
  price?: number;
  price_delta: number; // Delta added to base price (+15000)
  is_default?: boolean;
  sku_suffix?: string | null;
  image_url?: string | null;
  order_index?: number;
}

/**
 * Dynamic Add-on / Upsell Group
 */
export interface CatalogAddonGroup {
  id: string;
  organization_id?: string;
  name: string;          // e.g. "Garantía Extendida", "Empaque de Regalo", "Ingredientes Extra"
  description?: string | null;
  selection_type: 'single' | 'multiple';
  is_required: boolean;
  min_selections?: number;
  max_selections?: number;
  options: CatalogAddonOption[];
  order_index?: number;
  is_active?: boolean;
}

/**
 * Normalized Global / Item Add-on Model
 */
export interface CatalogAddon {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  price: number;
  price_type: 'fixed' | 'percentage' | 'per_unit';
  is_required: boolean;
  max_quantity: number;
  is_active: boolean;
  scope: 'global' | 'item';
  order_index: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Specification Tab for Product Detail Modal
 */
export interface CatalogSpecTab {
  id: string;
  title: string;
  content: string;
  type?: 'text' | 'bullets' | 'table' | 'key_value';
  items?: string[];
  key_values?: Record<string, string>;
  order_index: number;
  is_enabled?: boolean;
}

/**
 * Dynamic Status Badge
 */
export interface CatalogBadge {
  id: string;
  type: 'featured' | 'new' | 'low_stock' | 'discount' | 'custom';
  label: string;
  color?: string;
  bg_color?: string;
  text_color?: string;
  icon?: string;
}

/**
 * Classification-Specific Metadata Payloads
 */
export interface PhysicalProductDetails {
  weight_kg?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in' | 'mm' | 'm';
  };
  shipping_required?: boolean;
  origin_country?: string;
  hs_tariff_code?: string;
}

export interface DigitalProductDetails {
  delivery_mode?: 'download' | 'license_key' | 'access_link';
  delivery_type?: 'download' | 'license_key' | 'access_link';
  download_url?: string;
  file_size_bytes?: number;
  file_size_mb?: number;
  license_type?: 'single' | 'team' | 'enterprise' | 'unlimited';
  access_expiry_days?: number;
  license_keys_pool?: string[];
}

export interface ServiceProductDetails {
  pricing_model?: 'fixed' | 'hourly' | 'daily' | 'sq_meter' | 'deliverable' | 'custom';
  duration_minutes?: number;
  deliverables?: string[];
  sla_hours?: number;
  location_type?: 'remote' | 'on_site' | 'hybrid';
  prerequisites?: string[];
  worker_count?: number;
}

export interface SubscriptionProductDetails {
  billing_frequency?: 'monthly' | 'biweekly' | 'quarterly' | 'semiannual' | 'yearly';
  trial_days?: number;
  setup_fee?: number;
  minimum_commitment_months?: number;
  auto_renew?: boolean;
}

export type RealEstateOperationType = 'sale' | 'rent' | 'temporary_rent';
export type RealEstatePropertyType =
  | 'apartment'
  | 'house'
  | 'studio'
  | 'office'
  | 'commercial'
  | 'warehouse'
  | 'land'
  | 'country_house'
  | 'medical_office'
  | 'building'
  | 'other';
export type RealEstateParkingType = 'covered' | 'uncovered' | 'mixed' | 'communal' | 'none';

export interface RealEstateProductDetails {
  operation?: RealEstateOperationType;
  operation_type?: RealEstateOperationType;
  property_type?: RealEstatePropertyType;
  area_total_m2?: number | null;
  area_built_m2?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor_number?: number | null;
  stratum?: string | number | null; // Estrato 1 a 6, Comercial, Rural
  admin_fee?: number | null; // Valor mensual de administración
  antiquity?: string | null; // A estrenar, 1-5 años, etc.
  kitchen_type?: string | null; // Integral, Semi-integral, Americana/Abierta, Isla, Tradicional, Sin Cocina
  // Parking details (moto & carro & cubierto/intemperie)
  parking_cars?: number | null;
  parking_motorcycles?: number | null;
  parking_type?: RealEstateParkingType | null;
  // Location
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  hide_exact_address?: boolean | null;
  // Common Areas (Áreas Comunes)
  common_areas?: string[];
  // Multimedia & Tools
  virtual_tour_url?: string | null; // Recorrido 360° / Matterport / YouTube
  brochure_pdf_url?: string | null; // Ficha Técnica PDF
  show_mortgage_calculator?: boolean | null; // Simulador de crédito hipotecario
}

export interface ClassificationMetadata {
  physical?: PhysicalProductDetails;
  digital?: DigitalProductDetails;
  service?: ServiceProductDetails;
  subscription?: SubscriptionProductDetails;
  real_estate?: RealEstateProductDetails;
  // Flattened fallbacks
  weight_kg?: number;
  dimensions?: { length: number; width: number; height: number; unit: 'cm' | 'in' | 'mm' | 'm' };
  download_url?: string;
  file_size_mb?: number;
  license_type?: 'single' | 'team' | 'enterprise' | 'unlimited';
  deliverables?: string[];
  sla_hours?: number;
  duration_minutes?: number;
  location_type?: 'remote' | 'on_site' | 'hybrid';
  billing_frequency?: 'monthly' | 'biweekly' | 'quarterly' | 'semiannual' | 'yearly';
  trial_days?: number;
  minimum_commitment_months?: number;
  // Real Estate flattened fields
  operation_type?: RealEstateOperationType;
  property_type?: RealEstatePropertyType;
  area_total_m2?: number;
  area_built_m2?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor_number?: number;
  stratum?: string | number;
  admin_fee?: number;
  antiquity?: string;
  parking_cars?: number;
  parking_motorcycles?: number;
  parking_type?: RealEstateParkingType;
  city?: string;
  neighborhood?: string;
  address?: string;
  hide_exact_address?: boolean;
  common_areas?: string[];
  virtual_tour_url?: string;
  brochure_pdf_url?: string;
}

export interface StorefrontHeroSlide {
  id: string;
  image_url: string;
  title?: string | null;
  subtitle?: string | null;
  badge_text?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  link_url?: string | null;
}

export interface StorefrontHeroConfig {
  enabled: boolean;
  background_type?: 'gradient' | 'image' | 'slideshow';
  title?: string | null;
  subtitle?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  cta_enabled?: boolean;
  whatsapp_cta_enabled?: boolean;
  whatsapp_cta_text?: string | null;
  bg_gradient?: string;
  bg_image_url?: string | null;
  slides?: StorefrontHeroSlide[];
  slide_interval?: number;
  badge_text?: string | null;
  text_align?: 'left' | 'center' | 'right';
  hide_text?: boolean;
  overlay_opacity?: number;
  banner_height?: 'compact' | 'medium' | 'tall' | 'full';
}

export type StorefrontIndustryPreset =
  | 'auto'
  | 'real_estate'
  | 'physical_retail'
  | 'professional_services'
  | 'digital_software'
  | 'hybrid';

export interface StorefrontWidgetConfig {
  show_real_estate_filters?: boolean;
  show_cart_drawer?: boolean;
  show_mortgage_calculator?: boolean;
  show_whatsapp_button?: boolean;
  show_category_nav?: boolean;
  show_search_bar?: boolean;
  show_stock_badges?: boolean;
}

/**
 * Storefront Customizer Theme Configuration
 */
export interface StorefrontThemeConfig {
  theme: 'modern' | 'minimal' | 'dark_luxe' | 'vibrant' | 'editorial' | 'neo_brutalist' | 'swiss' | 'modern_glass' | 'gourmet_elegance' | 'cyber_glass_3d';
  theme_id?: string; // Legacy alias
  industry_preset?: StorefrontIndustryPreset;
  widget_config?: StorefrontWidgetConfig;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  color_mode?: 'dark' | 'light' | 'auto';
  background_style?: 'solid' | 'gradient' | 'mesh' | 'mesh_3d';
  primary_cta?: 'whatsapp' | 'cart' | 'buy' | 'quote' | 'booking';
  hero?: StorefrontHeroConfig;
  navigation_style?: 'pills' | 'tabs' | 'sidebar' | 'grid' | 'glass_cards' | 'underline_tabs' | 'floating_dock';
  category_nav_style?: string; // Legacy alias
  card_layout?: 'grid' | 'masonry' | 'list';
  enable_search?: boolean;
  enable_whatsapp_checkout?: boolean;
  enable_quote_request?: boolean;
  enable_qr_code?: boolean;
  faq?: Array<{ id?: string; question: string; answer: string; category?: string | null }>;
  testimonials?: Array<{ id?: string; name: string; role?: string | null; company?: string | null; avatar_url?: string | null; quote: string; rating?: number }>;
  social_links?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    whatsapp?: string;
    website?: string;
    google_maps?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  business_hours?: Record<string, string>;
  business_hours_text?: string;
}

export const DEFAULT_STOREFRONT_THEME_CONFIG: StorefrontThemeConfig = {
  theme: 'modern',
  industry_preset: 'auto',
  widget_config: {
    show_real_estate_filters: true,
    show_cart_drawer: true,
    show_mortgage_calculator: true,
    show_whatsapp_button: true,
    show_category_nav: true,
    show_search_bar: true,
    show_stock_badges: true,
  },
  primary_color: '#4F46E5',
  secondary_color: '#EC4899',
  accent_color: '#10B981',
  color_mode: 'auto',
  background_style: 'solid',
  primary_cta: 'whatsapp',
  hero: {
    enabled: true,
    background_type: 'gradient',
    title: 'Descubre Nuestras Soluciones',
    subtitle: 'Calidad superior, innovación y servicio personalizado.',
    cta_text: 'Explorar Catálogo',
    cta_url: '#catalog',
    cta_enabled: true,
    whatsapp_cta_enabled: true,
    whatsapp_cta_text: 'WhatsApp Directo',
    bg_gradient: 'from-indigo-900 via-slate-900 to-black',
    bg_image_url: null,
    slides: [],
    slide_interval: 5000,
    badge_text: 'Portafolio 2026',
    text_align: 'center',
    hide_text: false,
    overlay_opacity: 40,
    banner_height: 'medium',
  },
  navigation_style: 'pills',
  card_layout: 'grid',
  enable_search: true,
  enable_whatsapp_checkout: true,
  enable_quote_request: true,
  enable_qr_code: true,
  faq: [],
  testimonials: [],
  social_links: {},
  business_hours: {
    monday_friday: '08:00 - 18:00',
    saturday: '09:00 - 14:00',
    sunday: 'Cerrado',
  },
};

/**
 * Storefront Multi-Channel Action Payload
 */
export interface StorefrontActionPayload {
  actionType?: 'whatsapp' | 'quote' | 'wompi' | 'appointment' | 'cart' | 'add_to_cart' | 'whatsapp_checkout' | 'quote_request' | 'wompi_checkout' | 'appointment_booking';
  itemId: string;
  variantId?: string | null;
  selectedVariant?: CatalogVariant | null;
  selectedAddons?: Array<{
    groupId: string;
    optionId: string;
    name: string;
    priceDelta: number;
    quantity?: number;
  }>;
  calculatedTotalPrice: number;
  quantity: number;
  customerInfo?: {
    name: string;
    phone: string;
    email?: string;
    company_name?: string;
    address?: string;
    notes?: string;
  };
  deepLinkUrl: string;
  portalToken?: string | null;
  sourcePortalToken?: string;
  organizationId?: string | null;
  currency?: string;
  appointmentDetails?: {
    date?: string;
    timeSlot?: string;
    staffId?: string;
  };
}

/**
 * Universal Catalog Item Model (100% Backwards Compatible)
 */
export interface UniversalCatalogItem<TMetadata = Record<string, any>> {
  // === Core Identification & Multi-Tenant Isolation ===
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  category: string;
  category_id?: string | null;
  base_price: number;
  compare_at_price?: number | null;

  // === Universal Item Classification ===
  classification?: CatalogClassification;
  type: 'recurring' | 'one_off' | 'product' | 'physical' | 'digital' | 'service' | 'subscription' | 'real_estate';
  frequency?: 'monthly' | 'biweekly' | 'quarterly' | 'semiannual' | 'yearly' | null;

  // === Multi-Photo Gallery & Media ===
  image_url?: string | null; // Backwards compatible cover image URL (automatically mirrors cover photo)
  gallery_images?: CatalogGalleryImage[];
  images?: CatalogGalleryImage[]; // Direct alias for gallery_images
  video_url?: string | null;

  // === Inventory & Physical Attributes ===
  sku?: string | null;
  barcode?: string | null;
  inventory_quantity?: number | null;
  stock_quantity?: number | null; // Alias for inventory_quantity
  track_inventory?: boolean;
  track_stock?: boolean; // Alias for track_inventory
  allow_backorders?: boolean;
  low_stock_threshold?: number;

  // === Dynamic Variants ===
  has_variants?: boolean;
  variant_attributes?: CatalogAttributeGroup[];
  variants?: CatalogVariant[];
  variants_config?: {
    attributes: CatalogAttributeGroup[];
  } | Record<string, any>;

  // === Add-ons & Upsell Extras ===
  addon_groups?: CatalogAddonGroup[];
  add_ons?: CatalogAddonGroup[] | Record<string, any>; // Direct alias for addon_groups
  addons?: CatalogAddon[];        // Normalized joined addons

  // === Visual Badges & Specification Tabs ===
  badges?: CatalogBadge[] | string[];
  featured_badge?: string | null;
  structured_badges?: CatalogBadge[];
  specifications?: Record<string, any>;
  specs_tabs?: CatalogSpecTab[];
  spec_tabs?: Record<string, boolean> | CatalogSpecTab[];

  // === Classification Specific Metadata ===
  classification_metadata?: ClassificationMetadata;
  physical_details?: PhysicalProductDetails;
  digital_details?: DigitalProductDetails;
  service_details?: ServiceProductDetails;
  subscription_details?: SubscriptionProductDetails;
  real_estate_details?: RealEstateProductDetails;

  // === SEO & Discoverability ===
  seo_title?: string | null;
  seo_description?: string | null;
  seo_metadata?: {
    meta_title?: string;
    meta_description?: string;
    search_tags?: string[];
    og_image_url?: string | null;
  };

  // === Portal Visibility & UI Controls ===
  is_visible_in_portal: boolean;
  is_available?: boolean;
  is_active?: boolean;
  order_index?: number;
  cta_type?: 'whatsapp' | 'buy' | 'info' | 'quote' | 'appointment' | 'portfolio' | 'add_to_cart' | 'cart' | 'booking';
  price_label_type?: 'price' | 'base_price' | 'from';

  // === Legacy Compatibility Fields ===
  is_system_template?: boolean | null;
  ai_generated_image?: boolean | null;
  insights_access?: string | null;
  service_start_date?: string | null;
  billing_cycle_start_date?: string | null;
  briefing_template_id?: string | null;

  // === Timestamps & Generic Metadata ===
  metadata?: TMetadata;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

/**
 * ServiceCatalogItem Alias for 100% Backwards Compatibility
 */
export type ServiceCatalogItem<TMetadata = Record<string, any>> = UniversalCatalogItem<TMetadata>;

/**
 * Customer Profile Information for Storefront Cart & Multi-Channel Actions
 */
export interface StorefrontCustomerProfile {
  name?: string;
  phone?: string; // WhatsApp phone number (e.g. "573001234567")
  email?: string;
  company_name?: string;
  companyName?: string; // Alias
  address?: string;
  delivery_address?: string;
  deliveryAddress?: string; // Alias
  delivery_method?: 'pickup' | 'delivery';
  deliveryMethod?: 'pickup' | 'delivery'; // Alias
  notes?: string;
}

/**
 * Item in the Storefront Multi-Item Cart
 */
export interface StorefrontCartItem {
  id: string; // Unique cart line id: `${item_id}:${variant_id || 'base'}`
  catalog_item_id: string;
  itemId?: string; // Backwards compatible alias
  name: string;
  category?: string;
  classification?: CatalogClassification;
  thumbnail_url?: string;
  imageUrl?: string | null; // Backwards compatible alias
  base_price: number;
  basePrice?: number; // Alias
  unit_price: number;
  unitPrice?: number; // Alias
  final_price: number;
  totalPrice?: number; // Alias
  quantity: number;

  // Selected variant details
  variantId?: string | null;
  selected_variant?: {
    id: string;
    name: string;
    title?: string;
    sku?: string | null;
    barcode?: string | null;
    price_override?: number | null;
    price_modifier?: number;
    price_type?: string;
    attributes: Record<string, string | { name: string; value: string; label?: string }>;
  } | null;
  selectedVariant?: CatalogVariant | null; // Alias

  // Selected add-on options
  selected_addons: Array<{
    id: string;
    name: string;
    price: number;
    priceDelta?: number;
    groupId?: string;
    optionId?: string;
    quantity?: number;
    skuSuffix?: string | null;
  }>;
  selectedAddons?: Array<{
    groupId: string;
    optionId: string;
    name: string;
    priceDelta: number;
    quantity?: number;
    skuSuffix?: string | null;
  }>;

  custom_notes?: string;
  track_inventory?: boolean;
  trackInventory?: boolean;
  stock_quantity?: number | null;
  stockQuantity?: number | null;
  inventory_quantity?: number | null;
  allow_backorders?: boolean;
  allowBackorders?: boolean;
  low_stock_threshold?: number;
  sku?: string | null;
  isOutOfStock?: boolean;
  deepLinkUrl?: string;
  organization_id?: string | null;
  organizationId?: string | null;
}

/**
 * Storefront Cart Store State Model
 */
export interface StorefrontCartState {
  organization_id: string;
  organizationId?: string | null;
  portalToken?: string | null;
  items: StorefrontCartItem[];
  delivery_method: 'pickup' | 'delivery';
  deliveryMethod?: 'pickup' | 'delivery';
  customer_profile: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
    email?: string;
    company_name?: string;
    delivery_address?: string;
    delivery_method?: 'pickup' | 'delivery';
  };
  customerProfile?: StorefrontCustomerProfile;
  is_drawer_open: boolean;
  isOpen?: boolean;
  addItem: (item: Omit<StorefrontCartItem, 'id' | 'final_price'> | any) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  setDeliveryMethod: (method: 'pickup' | 'delivery') => void;
  updateCustomerProfile: (profile: Partial<StorefrontCartState['customer_profile']> | Partial<StorefrontCustomerProfile>) => void;
  setCustomerProfile?: (profile: Partial<StorefrontCustomerProfile>) => void;
  setDrawerOpen: (open: boolean) => void;
  openDrawer?: () => void;
  closeDrawer?: () => void;
  toggleDrawer?: () => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getItemCount?: () => number;
  getSubtotal: () => number;
  getTotal: () => number;
  hasOutOfStockItems?: () => boolean;
}

