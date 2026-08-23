/**
 * Universal Multi-Industry Catalog & Premium Storefront Portal
 * E2E Test Harness - Types, Contracts, and Validation Helpers
 */

import crypto from 'crypto';

export type CatalogClassification = 'physical' | 'digital' | 'service' | 'subscription' | 'real_estate';

export interface CatalogGalleryImage {
  id: string;
  url: string;
  is_cover: boolean;
  order_index: number;
  alt_text?: string;
  width?: number;
  height?: number;
}

export interface CatalogAttributeOption {
  id: string;
  label: string;
  value: string;
  swatch_type?: 'color' | 'image' | 'pill' | 'select';
  swatch_value?: string; // hex color or image URL
  order_index: number;
}

export interface CatalogAttributeGroup {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  swatch_type: 'color' | 'image' | 'pill' | 'select';
  options: CatalogAttributeOption[];
  is_active?: boolean;
}

export interface CatalogVariant {
  id: string;
  catalog_item_id: string;
  title: string;
  sku?: string;
  barcode?: string;
  price_modifier: number; // absolute price or offset
  price_type: 'fixed' | 'offset' | 'percentage';
  inventory_quantity: number;
  track_inventory: boolean;
  image_url?: string;
  attributes: Record<string, string>; // { "Talla": "M", "Color": "Azul" }
  is_active: boolean;
}

export interface CatalogAddonOption {
  id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
  sku_suffix?: string;
}

export interface CatalogAddonGroup {
  id: string;
  name: string;
  description?: string;
  selection_type?: 'single' | 'multiple';
  is_required: boolean;
  allow_multiple?: boolean;
  min_selections?: number;
  max_selections?: number;
  options: CatalogAddonOption[];
}

export interface UniversalCatalogItem {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category_id?: string;
  category?: string;
  base_price: number;
  compare_at_price?: number;
  type: 'recurring' | 'one_off' | 'product' | 'real_estate';
  classification: CatalogClassification;
  frequency?: string;
  image_url?: string; // Backwards compatible cover mirror
  gallery_images: CatalogGalleryImage[];
  video_url?: string;
  sku?: string;
  barcode?: string;
  inventory_quantity: number;
  track_inventory: boolean;
  allow_backorders: boolean;
  low_stock_threshold: number;
  has_variants: boolean;
  variant_attributes: CatalogAttributeGroup[];
  variants: CatalogVariant[];
  addon_groups: CatalogAddonGroup[];
  badges: string[]; // ["Destacado", "Novedad", "Pocas Unidades", "Descuento"]
  specifications: Record<string, any>;
  real_estate_details?: any;
  metadata?: any;
  is_visible_in_portal: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface StorefrontActionPayload {
  itemId: string;
  variantId?: string;
  selectedVariant?: CatalogVariant;
  selectedAddons?: Array<{ groupId?: string; optionId?: string; name: string; priceDelta: number }>;
  calculatedTotalPrice: number;
  quantity: number;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
  };
  deepLinkUrl: string;
}

export interface StoreCustomizerTheme {
  primary_color: string;
  font_family: string;
  hero_banner_url?: string;
  hero_title?: string;
  hero_subtitle?: string;
  faq_items?: Array<{ question: string; answer: string }>;
  testimonials?: Array<{ author: string; role: string; quote: string; avatar_url?: string }>;
  social_links?: Record<string, string>;
  business_hours?: Array<{ day: string; open: string; close: string; is_closed?: boolean }>;
}

export interface CRMLeadQuoteDraft {
  lead: {
    name: string;
    email: string;
    phone: string;
    source: string;
    organization_id: string;
  };
  quote: {
    organization_id: string;
    total_amount: number;
    currency: string;
    status: 'draft';
    items: Array<{
      catalog_item_id: string;
      variant_id?: string;
      item_name: string;
      unit_price: number;
      quantity: number;
      subtotal: number;
      addons?: Array<{ name: string; price: number }>;
    }>;
  };
}

export interface WompiSessionPayload {
  currency: string;
  amount_in_cents: number;
  reference: string;
  customer_email?: string;
  redirect_url: string;
  integrity_signature: string;
}

// -------------------------------------------------------------
// Pure Calculation & Validation Logic
// -------------------------------------------------------------

export function validateCatalogGalleryImage(image: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!image || typeof image !== 'object') {
    return { isValid: false, errors: ['Image must be an object'] };
  }
  if (!image.id || typeof image.id !== 'string') {
    errors.push('Image id is required and must be a string');
  }
  if (!image.url || typeof image.url !== 'string') {
    errors.push('Image url is required and must be a string');
  }
  if (typeof image.is_cover !== 'boolean') {
    errors.push('Image is_cover must be a boolean');
  }
  if (typeof image.order_index !== 'number' || image.order_index < 0) {
    errors.push('Image order_index must be a non-negative integer');
  }
  return { isValid: errors.length === 0, errors };
}

export function validateUniversalCatalogItem(item: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!item || typeof item !== 'object') {
    return { isValid: false, errors: ['Catalog item must be an object'] };
  }
  if (!item.id || typeof item.id !== 'string') {
    errors.push('Item id is required and must be a string');
  }
  if (!item.organization_id || typeof item.organization_id !== 'string') {
    errors.push('Item organization_id is required and must be a string');
  }
  if (!item.name || typeof item.name !== 'string') {
    errors.push('Item name is required and must be a string');
  }
  if (typeof item.base_price !== 'number' || item.base_price < 0) {
    errors.push('Item base_price must be a non-negative number');
  }
  const validClassifications = ['physical', 'digital', 'service', 'subscription', 'real_estate'];
  if (!validClassifications.includes(item.classification)) {
    errors.push('classification must be one of: physical, digital, service, subscription, real_estate');
  }
  const validTypes = ['product', 'one_off', 'recurring', 'real_estate'];
  if (!validTypes.includes(item.type)) {
    errors.push('type must be one of: product, one_off, recurring, real_estate');
  }

  if (Array.isArray(item.gallery_images)) {
    if (item.gallery_images.length > 8) {
      errors.push(`Gallery exceeds maximum limit of 8 photos (received ${item.gallery_images.length})`);
    }
    const coverCount = item.gallery_images.filter((img: any) => img.is_cover).length;
    if (coverCount > 1) {
      errors.push(`Gallery cannot contain more than 1 cover image (found ${coverCount})`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function compressClientWebP(
  input: { width: number; height: number; rawSizeBytes: number; mimeType: string },
  quality: number = 0.8
): {
  width: number;
  height: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  mimeType: string;
} {
  // Simulates browser client WebP conversion with 45-55% byte reduction
  const compressionRatio = quality >= 0.85 ? 0.45 : 0.55;
  const compressedSizeBytes = Math.round(input.rawSizeBytes * compressionRatio);

  return {
    width: input.width,
    height: input.height,
    compressedSizeBytes,
    compressionRatio,
    mimeType: 'image/webp',
  };
}

export function validateCatalogAttributeGroup(group: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!group || typeof group !== 'object') {
    return { isValid: false, errors: ['Attribute group must be an object'] };
  }
  if (!group.id || typeof group.id !== 'string') {
    errors.push('Attribute group id is required');
  }
  if (!group.name || typeof group.name !== 'string') {
    errors.push('Attribute group name is required');
  }
  if (!['color', 'image', 'pill', 'select'].includes(group.swatch_type)) {
    errors.push('swatch_type must be color, image, pill, or select');
  }
  if (!Array.isArray(group.options)) {
    errors.push('options must be an array');
  } else if (group.swatch_type === 'color') {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    group.options.forEach((opt: any, idx: number) => {
      if (!opt.swatch_value || !hexRegex.test(opt.swatch_value)) {
        errors.push(`Color option at index ${idx} must have a valid hex swatch_value`);
      }
    });
  }
  return { isValid: errors.length === 0, errors };
}

export function validateCatalogVariant(variant: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!variant || typeof variant !== 'object') {
    return { isValid: false, errors: ['Variant must be an object'] };
  }
  if (!variant.id || typeof variant.id !== 'string') {
    errors.push('Variant id is required');
  }
  if (!variant.title || typeof variant.title !== 'string') {
    errors.push('Variant title is required');
  }
  if (typeof variant.price_modifier !== 'number') {
    errors.push('Variant price_modifier must be a number');
  }
  if (!['fixed', 'offset', 'percentage'].includes(variant.price_type)) {
    errors.push('Variant price_type must be fixed, offset, or percentage');
  }
  if (typeof variant.inventory_quantity !== 'number' || variant.inventory_quantity < 0) {
    errors.push('Variant inventory_quantity must be a non-negative number');
  }
  return { isValid: errors.length === 0, errors };
}

export function generateCartesianVariants(
  groups: Array<{ name: string; options: Array<{ label: string; value: string }> }>,
  basePrice: number = 0,
  skuPrefix: string = 'SKU'
): CatalogVariant[] {
  if (!groups || groups.length === 0) return [];

  const cartesian = (arrays: any[][]): any[][] => {
    return arrays.reduce(
      (acc, curr) => acc.flatMap((c) => curr.map((n) => [...c, n])),
      [[]]
    );
  };

  const optionsPerGroup = groups.map((g) => g.options.map((opt) => ({ groupName: g.name, ...opt })));
  const combinations = cartesian(optionsPerGroup);

  const skuCodeMap: Record<string, string> = {
    'Negro Azabache': 'BLACK',
    'Blanco Hueso': 'WHITE',
    'Azul Marino': 'NAVY',
    'S': 'S',
    'M': 'M',
    'L': 'L',
    'XL': 'XL',
  };

  return combinations.map((combo, idx) => {
    const title = combo.map((c) => c.label).join(' / ');
    const attributes: Record<string, string> = {};
    const skuParts: string[] = [skuPrefix];

    combo.forEach((c) => {
      attributes[c.groupName] = c.value;
      const code = skuCodeMap[c.value] || c.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      skuParts.push(code);
    });

    return {
      id: `var_${idx + 1}`,
      catalog_item_id: 'item_dynamic',
      title,
      sku: skuParts.join('-'),
      price_modifier: 0,
      price_type: 'offset',
      inventory_quantity: 10,
      track_inventory: true,
      attributes,
      is_active: true,
    };
  });
}

export function validateCatalogAddonGroup(group: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!group || typeof group !== 'object') {
    return { isValid: false, errors: ['Addon group must be an object'] };
  }
  if (!group.id || typeof group.id !== 'string') {
    errors.push('Addon group id is required');
  }
  if (!group.name || typeof group.name !== 'string') {
    errors.push('Addon group name is required');
  }
  if (!['single', 'multiple'].includes(group.selection_type)) {
    errors.push('selection_type must be single or multiple');
  }
  if (!Array.isArray(group.options)) {
    errors.push('options must be an array');
  }
  return { isValid: errors.length === 0, errors };
}

export function calculateCatalogItemPrice(
  basePriceOrItem: number | Pick<UniversalCatalogItem, 'base_price'>,
  variant?: CatalogVariant | null,
  selectedAddons?: Array<{ priceDelta?: number; price_delta?: number; name?: string }> | null,
  quantity: number = 1
): number {
  let unitPrice = typeof basePriceOrItem === 'number' ? basePriceOrItem : basePriceOrItem.base_price;

  if (variant) {
    if (variant.price_type === 'fixed') {
      unitPrice = variant.price_modifier;
    } else if (variant.price_type === 'offset') {
      unitPrice = unitPrice + variant.price_modifier;
    } else if (variant.price_type === 'percentage') {
      unitPrice = Math.round(unitPrice * (1 + variant.price_modifier / 100));
    }
  }

  if (selectedAddons && selectedAddons.length > 0) {
    for (const addon of selectedAddons) {
      const delta = addon.priceDelta ?? addon.price_delta ?? 0;
      unitPrice += delta;
    }
  }

  unitPrice = Math.max(0, Math.round(unitPrice));
  return unitPrice * Math.max(1, quantity);
}

export function calculateEffectiveUnitPrice(
  item: Pick<UniversalCatalogItem, 'base_price'>,
  variant?: CatalogVariant | null,
  selectedAddons?: Array<{ priceDelta: number }> | null
): number {
  return calculateCatalogItemPrice(item, variant, selectedAddons, 1);
}

export function calculateEffectiveTotalPrice(
  item: Pick<UniversalCatalogItem, 'base_price'>,
  variant?: CatalogVariant | null,
  selectedAddons?: Array<{ priceDelta: number }> | null,
  quantity: number = 1
): number {
  return calculateCatalogItemPrice(item, variant, selectedAddons, quantity);
}

export function generateDynamicSKU(
  baseSku?: string,
  variantSku?: string,
  selectedAddons?: Array<{ skuSuffix?: string }>
): string {
  let sku = variantSku || baseSku || 'SKU-ITEM';
  if (selectedAddons && selectedAddons.length > 0) {
    for (const addon of selectedAddons) {
      if (addon.skuSuffix) {
        sku += `-${addon.skuSuffix.replace(/^-+/, '')}`;
      }
    }
  }
  return sku.toUpperCase();
}

export function evaluateDynamicBadges(item: UniversalCatalogItem): string[] {
  const dynamicBadges: string[] = [];

  if (item.track_inventory && item.inventory_quantity <= 0 && !item.allow_backorders) {
    dynamicBadges.push('Agotado');
  } else if (
    item.track_inventory &&
    item.inventory_quantity > 0 &&
    item.inventory_quantity <= (item.low_stock_threshold || 5)
  ) {
    dynamicBadges.push('Pocas Unidades');
  }

  if (item.compare_at_price && item.compare_at_price > item.base_price) {
    const discountPct = Math.round(
      ((item.compare_at_price - item.base_price) / item.compare_at_price) * 100
    );
    if (discountPct > 0) {
      dynamicBadges.push(`-${discountPct}% Descuento`);
    }
  }

  if (item.badges && Array.isArray(item.badges)) {
    for (const b of item.badges) {
      const trimmed = b.trim();
      if (!trimmed) continue;
      if (dynamicBadges.includes('Agotado') && (trimmed === 'Pocas Unidades' || trimmed === 'En Stock')) {
        continue;
      }
      if (!dynamicBadges.includes(trimmed)) {
        dynamicBadges.push(trimmed.slice(0, 100));
      }
    }
  }

  return dynamicBadges.slice(0, 3);
}

export function generateWompiSignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string
): string {
  const concatenated = `${reference}${amountInCents}${currency}${integritySecret}`;
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}

export function buildWhatsAppCheckoutUrl(
  payload: StorefrontActionPayload,
  businessPhone: string = '+573001234567',
  itemName?: string,
  currencySymbol: string = '$'
): string {
  let cleanPhone = businessPhone.replace(/[^0-9]/g, '');
  if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
    cleanPhone = '57' + cleanPhone;
  }

  const lines: string[] = [
    `🛒 *Nuevo Pedido desde Catálogo Pixy*`,
    `Producto: ${itemName || payload.itemId}`,
  ];

  if (payload.selectedVariant) {
    lines.push(`▫️ Variante: ${payload.selectedVariant.title}`);
  }

  if (payload.selectedAddons && payload.selectedAddons.length > 0) {
    const addonNames = payload.selectedAddons.map((a) => a.name).join(', ');
    lines.push(`▫️ Adicionales: ${addonNames}`);
  }

  const formattedTotal = (payload.calculatedTotalPrice || 0).toLocaleString('es-CO').replace(/,/g, '.');
  lines.push(`💰 *Total estimado*: ${currencySymbol}${formattedTotal}`);

  if (payload.customerInfo?.notes) {
    lines.push(`📝 *Notas*: ${payload.customerInfo.notes}`);
  }

  if (payload.deepLinkUrl) {
    lines.push(`🔗 Ver en catálogo: ${payload.deepLinkUrl}`);
  }

  const rawText = lines.join('\n');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(rawText)}`;
}

export function formatWhatsAppMessage(
  payload: StorefrontActionPayload,
  businessPhone: string = '+573001234567'
): { rawText: string; encodedUri: string; phone: string } {
  let cleanPhone = (businessPhone || '573001234567').replace(/[^0-9]/g, '');
  if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
    cleanPhone = '57' + cleanPhone;
  }

  const lines: string[] = [
    `👋 *Hola! Deseo ordenar desde su Catálogo Pixy:*`,
    `🛒 *Item:* ${payload.itemId}`,
  ];

  if (payload.selectedVariant) {
    const attrs = Object.entries(payload.selectedVariant.attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    lines.push(`✨ *Variante:* ${payload.selectedVariant.title} (${attrs})`);
  }

  if (payload.selectedAddons && payload.selectedAddons.length > 0) {
    const addonNames = payload.selectedAddons
      .map((a) => `${a.name} (+$${a.priceDelta.toLocaleString('es-CO')})`)
      .join(', ');
    lines.push(`➕ *Adicionales:* ${addonNames}`);
  }

  lines.push(`📦 *Cantidad:* ${payload.quantity}`);
  lines.push(`💰 *Total:* $${payload.calculatedTotalPrice.toLocaleString('es-CO')} COP`);

  if (payload.customerInfo?.name) {
    lines.push(`👤 *Cliente:* ${payload.customerInfo.name}`);
  }
  if (payload.customerInfo?.notes) {
    lines.push(`📝 *Notas:* ${payload.customerInfo.notes}`);
  }

  lines.push(`🔗 *Ver Producto:* ${payload.deepLinkUrl}`);

  let rawText = lines.join('\n');
  if (rawText.length > 4000) {
    rawText = rawText.slice(0, 3950) + '\n... [Mensaje comprimido]';
  }

  const encodedUri = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(rawText)}`;

  return {
    rawText,
    encodedUri,
    phone: cleanPhone,
  };
}

export function parseVideoUrl(url: string): {
  platform: 'youtube' | 'vimeo' | 'mp4' | 'unknown';
  videoId?: string;
  embedUrl?: string;
  isMutedAutoplaySupported: boolean;
} {
  if (!url || typeof url !== 'string') {
    return { platform: 'unknown', isMutedAutoplaySupported: false };
  }

  // YouTube check
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return {
      platform: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1`,
      isMutedAutoplaySupported: true,
    };
  }

  // Vimeo check
  const vimeoMatch = url.match(/(?:vimeo\.com\/(?:video\/)?)([0-9]+)/);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      platform: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1`,
      isMutedAutoplaySupported: true,
    };
  }

  // MP4 check
  if (url.endsWith('.mp4') || url.includes('.mp4')) {
    return {
      platform: 'mp4',
      embedUrl: url,
      isMutedAutoplaySupported: true,
    };
  }

  return { platform: 'unknown', isMutedAutoplaySupported: false };
}

export function validateStorefrontActionPayload(payload: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Payload must be an object'] };
  }
  if (!payload.itemId || typeof payload.itemId !== 'string') {
    errors.push('itemId is required');
  }
  if (typeof payload.calculatedTotalPrice !== 'number' || payload.calculatedTotalPrice < 0) {
    errors.push('calculatedTotalPrice must be a non-negative number');
  }
  if (typeof payload.quantity !== 'number' || payload.quantity < 1) {
    errors.push('quantity must be at least 1');
  }
  if (!payload.deepLinkUrl || typeof payload.deepLinkUrl !== 'string') {
    errors.push('deepLinkUrl is required');
  }
  return { isValid: errors.length === 0, errors };
}

export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '')
    .replace(/<[^>]+>/g, '');
}

export function sanitizeCssColor(input: string, fallback: string = '#3B82F6'): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed;
  }
  if (/^(rgb|hsl)a?\([\d\s%,.]+\)$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

// -------------------------------------------------------------
// Cart, Inventory & Action Hub Enterprise Contracts
// -------------------------------------------------------------

export interface StorefrontCartItem {
  id: string; // unique cart line id: `${catalog_item_id}:${variant_id || 'base'}`
  catalog_item_id: string;
  name: string;
  thumbnail_url?: string;
  base_price: number;
  unit_price: number;
  final_price: number;
  quantity: number;
  selected_variant?: {
    id: string;
    name: string;
    sku?: string;
    barcode?: string;
    price_override?: number;
    price_modifier?: number;
    price_type?: 'fixed' | 'offset' | 'percentage';
    attributes: Record<string, string>;
  };
  selected_addons: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  custom_notes?: string;
  track_inventory?: boolean;
  stock_quantity?: number;
  allow_backorders?: boolean;
  low_stock_threshold?: number;
  sku?: string;
}

export interface StorefrontCartState {
  organization_id: string;
  items: StorefrontCartItem[];
  delivery_method: 'pickup' | 'delivery';
  customer_profile: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  };
  is_drawer_open: boolean;
  addItem: (item: Omit<StorefrontCartItem, 'id' | 'final_price'>) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  setDeliveryMethod: (method: 'pickup' | 'delivery') => void;
  updateCustomerProfile: (profile: Partial<StorefrontCartState['customer_profile']>) => void;
  setDrawerOpen: (open: boolean) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getTotal: () => number;
}

export function computeCartLineUnitPrice(
  basePrice: number,
  variant?: StorefrontCartItem['selected_variant'] | null,
  addons?: Array<{ price: number }> | null
): number {
  let unit = basePrice;
  if (variant) {
    if (variant.price_override !== undefined && variant.price_override !== null) {
      unit = variant.price_override;
    } else if (variant.price_type === 'fixed') {
      unit = variant.price_modifier ?? unit;
    } else if (variant.price_type === 'percentage') {
      unit = Math.round(unit * (1 + (variant.price_modifier ?? 0) / 100));
    } else {
      // default offset
      unit = unit + (variant.price_modifier ?? 0);
    }
  }

  if (addons && addons.length > 0) {
    for (const addon of addons) {
      unit += addon.price;
    }
  }

  return Math.max(0, Math.round(unit));
}

export function createStorefrontCartStore(organizationId: string): StorefrontCartState {
  let state: {
    organization_id: string;
    items: StorefrontCartItem[];
    delivery_method: 'pickup' | 'delivery';
    customer_profile: {
      name: string;
      phone: string;
      address?: string;
      notes?: string;
    };
    is_drawer_open: boolean;
  } = {
    organization_id: organizationId,
    items: [],
    delivery_method: 'pickup',
    customer_profile: {
      name: '',
      phone: '',
      address: '',
      notes: '',
    },
    is_drawer_open: false,
  };

  const store: StorefrontCartState = {
    get organization_id() {
      return state.organization_id;
    },
    get items() {
      return state.items;
    },
    get delivery_method() {
      return state.delivery_method;
    },
    get customer_profile() {
      return state.customer_profile;
    },
    get is_drawer_open() {
      return state.is_drawer_open;
    },

    addItem(itemInput) {
      const lineId = `${itemInput.catalog_item_id}:${itemInput.selected_variant?.id || 'base'}`;
      const unitPrice = computeCartLineUnitPrice(
        itemInput.base_price,
        itemInput.selected_variant,
        itemInput.selected_addons
      );
      const existingIdx = state.items.findIndex((it) => it.id === lineId);

      if (existingIdx >= 0) {
        const existing = state.items[existingIdx];
        const newQty = existing.quantity + itemInput.quantity;
        state.items[existingIdx] = {
          ...existing,
          quantity: newQty,
          unit_price: unitPrice,
          final_price: unitPrice * newQty,
          selected_addons: itemInput.selected_addons || existing.selected_addons,
          custom_notes: itemInput.custom_notes || existing.custom_notes,
        };
      } else {
        const finalPrice = unitPrice * itemInput.quantity;
        state.items.push({
          ...itemInput,
          id: lineId,
          unit_price: unitPrice,
          final_price: finalPrice,
        });
      }
    },

    removeItem(lineId: string) {
      state.items = state.items.filter((it) => it.id !== lineId);
    },

    updateQuantity(lineId: string, quantity: number) {
      if (quantity <= 0) {
        store.removeItem(lineId);
        return;
      }
      const existingIdx = state.items.findIndex((it) => it.id === lineId);
      if (existingIdx >= 0) {
        const item = state.items[existingIdx];
        state.items[existingIdx] = {
          ...item,
          quantity,
          final_price: item.unit_price * quantity,
        };
      }
    },

    setDeliveryMethod(method: 'pickup' | 'delivery') {
      state.delivery_method = method;
    },

    updateCustomerProfile(profile: Partial<StorefrontCartState['customer_profile']>) {
      state.customer_profile = {
        ...state.customer_profile,
        ...profile,
      };
    },

    setDrawerOpen(open: boolean) {
      state.is_drawer_open = open;
    },

    clearCart() {
      state.items = [];
    },

    getTotalItems(): number {
      return state.items.reduce((sum, it) => sum + it.quantity, 0);
    },

    getSubtotal(): number {
      return state.items.reduce((sum, it) => sum + it.final_price, 0);
    },

    getTotal(): number {
      return store.getSubtotal();
    },
  };

  return store;
}

export interface StockStatusEvaluation {
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'untracked';
  badge: string | null;
  canPurchase: boolean;
}

export function evaluateStockStatus(item: {
  track_inventory?: boolean;
  trackInventory?: boolean;
  track_stock?: boolean;
  trackStock?: boolean;
  stock_quantity?: number | null;
  stockQuantity?: number | null;
  inventory_quantity?: number | null;
  allow_backorders?: boolean;
  allowBackorders?: boolean;
  low_stock_threshold?: number;
  lowStockThreshold?: number;
} | any): StockStatusEvaluation {
  const track = Boolean(item.track_inventory ?? item.trackInventory ?? item.track_stock ?? item.trackStock);
  if (!track) {
    return { status: 'untracked', badge: null, canPurchase: true };
  }

  const stock = Number(item.stock_quantity ?? item.stockQuantity ?? item.inventory_quantity ?? 0);
  const threshold = Number(item.low_stock_threshold ?? item.lowStockThreshold ?? 5);
  const allowBackorders = Boolean(item.allow_backorders ?? item.allowBackorders);

  if (stock <= 0 && !allowBackorders) {
    return { status: 'out_of_stock', badge: 'Agotado', canPurchase: false };
  }

  if (stock <= 0 && allowBackorders) {
    return { status: 'backorder', badge: 'Disponible bajo pedido', canPurchase: true };
  }

  if (stock > 0 && stock <= threshold) {
    return {
      status: 'low_stock',
      badge: `¡Últimas ${stock} unidades!`,
      canPurchase: true,
    };
  }

  return { status: 'in_stock', badge: null, canPurchase: true };
}

export interface InventoryItemState {
  catalogItemId: string;
  variantId?: string;
  stockQuantity: number;
  trackInventory: boolean;
  allowBackorders: boolean;
  lowStockThreshold: number;
  sku?: string;
  barcode?: string;
}

export class InMemoryInventoryEngine {
  private stockMap = new Map<string, InventoryItemState>();
  private lockPromise: Promise<void> = Promise.resolve();

  private getKey(catalogItemId: string, variantId?: string): string {
    return `${catalogItemId}:${variantId || 'base'}`;
  }

  public registerItem(state: InventoryItemState): void {
    const key = this.getKey(state.catalogItemId, state.variantId);
    this.stockMap.set(key, { ...state });
  }

  public getItem(catalogItemId: string, variantId?: string): InventoryItemState | undefined {
    return this.stockMap.get(this.getKey(catalogItemId, variantId));
  }

  public async decrementStockAction(params: {
    organizationId: string;
    items: Array<{
      catalogItemId: string;
      variantId?: string;
      quantity: number;
    }>;
  }): Promise<{ success: boolean; error?: string; updatedItems?: InventoryItemState[] }> {
    // Acquire mutex lock to simulate PostgreSQL SELECT ... FOR UPDATE
    let releaseLock: () => void = () => {};
    const previousLock = this.lockPromise;
    this.lockPromise = new Promise((resolve) => {
      releaseLock = resolve;
    });
    await previousLock;

    try {
      if (!params.items || params.items.length === 0) {
        return { success: false, error: 'No items provided for stock decrement' };
      }

      // Step 1: Pre-validation - check stock for all items
      for (const req of params.items) {
        if (req.quantity <= 0) {
          return { success: false, error: `Invalid quantity ${req.quantity} for item ${req.catalogItemId}` };
        }
        const key = this.getKey(req.catalogItemId, req.variantId);
        const record = this.stockMap.get(key);
        if (!record) {
          return { success: false, error: `Inventory item not found: ${req.catalogItemId}` };
        }

        if (record.trackInventory && !record.allowBackorders) {
          if (record.stockQuantity < req.quantity) {
            return {
              success: false,
              error: `Stock insuficiente para ${req.catalogItemId}. Disponible: ${record.stockQuantity}, Requerido: ${req.quantity}`,
            };
          }
        }
      }

      // Step 2: Atomic Decrement
      const updated: InventoryItemState[] = [];
      for (const req of params.items) {
        const key = this.getKey(req.catalogItemId, req.variantId);
        const record = this.stockMap.get(key)!;
        if (record.trackInventory) {
          record.stockQuantity -= req.quantity;
        }
        updated.push({ ...record });
      }

      return { success: true, updatedItems: updated };
    } finally {
      releaseLock();
    }
  }

  public async restoreStockAction(params: {
    organizationId: string;
    items: Array<{
      catalogItemId: string;
      variantId?: string;
      quantity: number;
    }>;
  }): Promise<{ success: boolean; error?: string; updatedItems?: InventoryItemState[] }> {
    if (!params.items || params.items.length === 0) {
      return { success: false, error: 'No items provided for stock restoration' };
    }

    const updated: InventoryItemState[] = [];
    for (const req of params.items) {
      const key = this.getKey(req.catalogItemId, req.variantId);
      const record = this.stockMap.get(key);
      if (record && record.trackInventory) {
        record.stockQuantity += req.quantity;
        updated.push({ ...record });
      }
    }

    return { success: true, updatedItems: updated };
  }

  public async updateItemStockAction(params: {
    organizationId: string;
    catalogItemId: string;
    variantId?: string;
    stockQuantity: number;
    trackInventory?: boolean;
    allowBackorders?: boolean;
    lowStockThreshold?: number;
    sku?: string;
    barcode?: string;
  }): Promise<{ success: boolean; data?: InventoryItemState; error?: string }> {
    const key = this.getKey(params.catalogItemId, params.variantId);
    const existing = this.stockMap.get(key) || {
      catalogItemId: params.catalogItemId,
      variantId: params.variantId,
      stockQuantity: 0,
      trackInventory: true,
      allowBackorders: false,
      lowStockThreshold: 5,
    };

    const updated: InventoryItemState = {
      ...existing,
      stockQuantity: params.stockQuantity,
      trackInventory: params.trackInventory ?? existing.trackInventory,
      allowBackorders: params.allowBackorders ?? existing.allowBackorders,
      lowStockThreshold: params.lowStockThreshold ?? existing.lowStockThreshold,
      sku: params.sku ?? existing.sku,
      barcode: params.barcode ?? existing.barcode,
    };

    this.stockMap.set(key, updated);
    return { success: true, data: updated };
  }
}

export function formatConsolidatedWhatsAppCartOrder(
  cart: StorefrontCartState,
  businessPhone: string = '+573001234567',
  currencySymbol: string = '$'
): { rawText: string; encodedUri: string; phone: string } {
  let cleanPhone = (businessPhone || '573001234567').replace(/[^0-9]/g, '');
  if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
    cleanPhone = '57' + cleanPhone;
  }

  const deliveryLabel = cart.delivery_method === 'delivery' ? '🚚 Envío a Domicilio' : '🏪 Retiro en Tienda';

  const lines: string[] = [
    `🛒 *NUEVO PEDIDO DESDE TIENDA PIXY*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📦 *Detalle de Productos:*`,
  ];

  cart.items.forEach((item, index) => {
    let line = `${index + 1}. *${item.name}* x${item.quantity} — ${currencySymbol}${item.final_price.toLocaleString('es-CO')}`;
    if (item.selected_variant) {
      line += `\n   ▫️ Variante: ${item.selected_variant.name}`;
    }
    if (item.selected_addons && item.selected_addons.length > 0) {
      const addons = item.selected_addons.map((a) => `${a.name} (+${currencySymbol}${a.price.toLocaleString('es-CO')})`).join(', ');
      line += `\n   ▫️ Adicionales: ${addons}`;
    }
    if (item.custom_notes) {
      line += `\n   ▫️ Nota: ${item.custom_notes}`;
    }
    lines.push(line);
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🛵 *Método de Entrega:* ${deliveryLabel}`);
  lines.push(`💰 *TOTAL GENERAL:* ${currencySymbol}${cart.getTotal().toLocaleString('es-CO')}`);

  if (cart.customer_profile.name || cart.customer_profile.phone) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`👤 *Datos del Cliente:*`);
    if (cart.customer_profile.name) lines.push(`• Nombre: ${cart.customer_profile.name}`);
    if (cart.customer_profile.phone) lines.push(`• Teléfono: ${cart.customer_profile.phone}`);
    if (cart.customer_profile.address) lines.push(`• Dirección: ${cart.customer_profile.address}`);
    if (cart.customer_profile.notes) lines.push(`• Notas: ${cart.customer_profile.notes}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`_Pedido generado automáticamente desde Storefront Pixy_`);

  const rawText = lines.join('\n');
  const encodedUri = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(rawText)}`;

  return { rawText, encodedUri, phone: cleanPhone };
}

export function generateConsolidatedWompiSession(
  cart: StorefrontCartState,
  integritySecret: string = 'test_secret',
  publicKey: string = 'pub_test_dummy',
  redirectUrl: string = 'https://pixy.agency/portal',
  currency: string = 'COP'
): {
  reference: string;
  amountInCents: number;
  currency: string;
  signature: string;
  checkoutUrl: string;
} {
  const amountInCents = Math.round(cart.getTotal() * 100);
  const reference = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const rawSig = `${reference}${amountInCents}${currency}${integritySecret}`;
  const signature = crypto.createHash('sha256').update(rawSig).digest('hex');

  const checkoutUrl = `https://checkout.wompi.co/p/?public-key=${encodeURIComponent(
    publicKey
  )}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${encodeURIComponent(
    reference
  )}&signature:integrity=${signature}&redirect-url=${encodeURIComponent(redirectUrl)}`;

  return {
    reference,
    amountInCents,
    currency,
    signature,
    checkoutUrl,
  };
}

export function generateConsolidatedCRMQuote(
  cart: StorefrontCartState,
  orgId: string
): {
  lead: {
    organization_id: string;
    name: string;
    phone: string;
    address?: string;
    notes?: string;
    source: string;
  };
  quote: {
    organization_id: string;
    number: string;
    title: string;
    total: number;
    status: 'draft';
    items: Array<{
      catalog_item_id: string;
      variant_id?: string;
      variant_title?: string;
      description: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      addons: Array<{ name: string; price: number }>;
    }>;
  };
} {
  const quoteNumber = `COT-${Date.now().toString().slice(-6)}`;
  return {
    lead: {
      organization_id: orgId,
      name: cart.customer_profile.name || 'Cliente Storefront',
      phone: cart.customer_profile.phone || '',
      address: cart.customer_profile.address,
      notes: cart.customer_profile.notes,
      source: 'storefront_cart',
    },
    quote: {
      organization_id: orgId,
      number: quoteNumber,
      title: `Cotización Formal (${cart.getTotalItems()} productos)`,
      total: cart.getTotal(),
      status: 'draft',
      items: cart.items.map((it) => ({
        catalog_item_id: it.catalog_item_id,
        variant_id: it.selected_variant?.id,
        variant_title: it.selected_variant?.name,
        description: it.name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        subtotal: it.final_price,
        addons: it.selected_addons || [],
      })),
    },
  };
}

export function resolveEffectiveCTA(
  item: { cta_type?: string | null },
  theme: { primary_cta?: string | null } | null
): 'whatsapp' | 'cart' | 'buy' | 'quote' | 'booking' {
  const validCTAs = ['whatsapp', 'cart', 'buy', 'quote', 'booking'];
  if (item.cta_type && validCTAs.includes(item.cta_type)) {
    return item.cta_type as any;
  }
  if (item.cta_type === 'add_to_cart') return 'cart';
  if (item.cta_type === 'appointment') return 'booking';

  if (theme?.primary_cta && validCTAs.includes(theme.primary_cta)) {
    return theme.primary_cta as any;
  }
  if (theme?.primary_cta === 'add_to_cart') return 'cart';
  if (theme?.primary_cta === 'appointment') return 'booking';

  return 'whatsapp';
}

