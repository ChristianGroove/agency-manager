/**
 * ==============================================================================
 * ZOD SCHEMAS: Universal Multi-Industry Catalog & Storefront Portal
 * Location: src/modules/features/catalog/schemas/catalog.schema.ts
 * Module: Universal Catalog (Pixy Agency Manager)
 * 100% Backwards Compatible with Quotes, Invoices, Contracts, CRM & Portal
 * ==============================================================================
 */

import { z } from 'zod';

// ------------------------------------------------------------------------------
// CONSTANTS & REGEX PATTERNS
// ------------------------------------------------------------------------------

export const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;

export const MAX_GALLERY_IMAGES = 8;
export const MAX_VARIANTS_PER_ITEM = 50;
export const MAX_ADDON_OPTIONS_PER_GROUP = 20;

const generateFallbackUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ------------------------------------------------------------------------------
// 1. GALLERY IMAGES SCHEMA
// ------------------------------------------------------------------------------

export const catalogGalleryImageSchema = z.object({
  id: z.string().min(1, 'El ID de la imagen es requerido').default(generateFallbackUUID),
  url: z.string().min(1, 'La URL de la imagen es requerida').refine(
    (val) =>
      val.startsWith('/') ||
      val.startsWith('http://') ||
      val.startsWith('https://') ||
      val.startsWith('blob:') ||
      val.startsWith('data:image/'),
    { message: 'La URL debe ser una ruta válida, enlace web (http/https), blob o data URI' }
  ),
  is_cover: z.boolean().default(false),
  order_index: z.number().int().min(0, 'El índice de orden debe ser mayor o igual a 0').default(0),
  alt_text: z.string().max(255, 'El texto alternativo no puede exceder 255 caracteres').optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  file_size_bytes: z.number().int().nonnegative().optional().nullable(),
  blurhash: z.string().optional().nullable(),
});

export const catalogGalleryImagesArraySchema = z
  .array(catalogGalleryImageSchema)
  .max(MAX_GALLERY_IMAGES, `Máximo ${MAX_GALLERY_IMAGES} imágenes permitidas por producto`);

// ------------------------------------------------------------------------------
// 2. ITEM CLASSIFICATION & METADATA SCHEMAS
// ------------------------------------------------------------------------------

export const catalogItemClassificationSchema = z.enum([
  'physical',
  'digital',
  'service',
  'subscription',
]);

export const legacyServiceTypeSchema = z.enum([
  'recurring',
  'one_off',
  'product',
  'physical',
  'digital',
  'service',
  'subscription',
]);

export const billingFrequencySchema = z.enum([
  'monthly',
  'biweekly',
  'quarterly',
  'semiannual',
  'yearly',
]);

// Classification-specific metadata schemas
export const physicalMetadataSchema = z.object({
  weight_kg: z.number().nonnegative('El peso no puede ser negativo').optional().nullable(),
  dimensions: z
    .object({
      length: z.number().nonnegative('El largo no puede ser negativo').default(0),
      width: z.number().nonnegative('El ancho no puede ser negativo').default(0),
      height: z.number().nonnegative('El alto no puede ser negativo').default(0),
      unit: z.enum(['cm', 'in', 'mm', 'm']).default('cm'),
    })
    .optional()
    .nullable(),
  shipping_required: z.boolean().default(true),
  origin_country: z.string().max(3).optional().nullable(),
  hs_tariff_code: z.string().max(30).optional().nullable(),
});

export const digitalMetadataSchema = z.object({
  delivery_type: z.enum(['download', 'license_key', 'access_link']).default('download'),
  download_url: z.string().url('URL de descarga inválida').optional().nullable().or(z.literal('')),
  file_size_mb: z.number().nonnegative('El tamaño de archivo no puede ser negativo').optional().nullable(),
  license_type: z.enum(['single', 'team', 'enterprise', 'unlimited']).default('single'),
  access_expiry_days: z.number().int().positive('Los días de acceso deben ser positivos').optional().nullable(),
  license_keys_pool: z.array(z.string()).optional().default([]),
});

export const serviceMetadataSchema = z.object({
  pricing_model: z.enum(['fixed', 'hourly', 'daily', 'sq_meter', 'deliverable', 'custom']).default('fixed'),
  duration_minutes: z.number().int().positive('La duración en minutos debe ser positiva').optional().nullable(),
  deliverables: z.array(z.string().min(1, 'El entregable no puede estar vacío')).default([]),
  sla_hours: z.number().int().positive('El SLA en horas debe ser positivo').optional().nullable(),
  location_type: z.enum(['remote', 'on_site', 'hybrid']).default('remote'),
  prerequisites: z.array(z.string()).optional().default([]),
});

export const subscriptionMetadataSchema = z.object({
  billing_frequency: billingFrequencySchema.default('monthly'),
  trial_days: z.number().int().nonnegative('Los días de prueba no pueden ser negativos').default(0),
  minimum_commitment_months: z.number().int().nonnegative('El compromiso mínimo no puede ser negativo').default(0),
  setup_fee: z.number().nonnegative('La tarifa de activación no puede ser negativa').default(0),
  auto_renew: z.boolean().default(true),
});

export const classificationMetadataSchema = z.object({
  physical: physicalMetadataSchema.optional(),
  digital: digitalMetadataSchema.optional(),
  service: serviceMetadataSchema.optional(),
  subscription: subscriptionMetadataSchema.optional(),
});

// ------------------------------------------------------------------------------
// 3. ATTRIBUTE OPTIONS & GROUPS SCHEMAS
// ------------------------------------------------------------------------------

export const catalogSwatchTypeSchema = z.enum([
  'color',
  'image',
  'pill',
  'select',
  'color_swatch',
  'image_swatch',
  'pills',
  'radio',
]);

export const catalogAttributeOptionSchema = z
  .object({
    id: z.string().min(1).default(generateFallbackUUID),
    label: z.string().min(1, 'El nombre de la opción es requerido').max(100, 'Máximo 100 caracteres'),
    value: z.string().min(1, 'El valor es requerido').max(100, 'Máximo 100 caracteres'),
    swatch_type: catalogSwatchTypeSchema.optional(),
    swatch_value: z.string().optional().nullable(),
    hex_color: z.string().regex(HEX_COLOR_REGEX, 'Color hexadecimal inválido (ej: #FF0000)').optional().nullable(),
    image_url: z.string().optional().nullable(),
    price_modifier: z.number().default(0),
    order_index: z.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    // Validar formato HEX si el swatch es de color
    if ((data.swatch_type === 'color' || data.swatch_type === 'color_swatch') && data.swatch_value) {
      if (!HEX_COLOR_REGEX.test(data.swatch_value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['swatch_value'],
          message: 'El valor de muestra de color debe ser un código HEX válido (ej: #4F46E5)',
        });
      }
    }
  });

export const catalogAttributeGroupSchema = z.object({
  id: z.string().min(1).default(generateFallbackUUID).optional(),
  organization_id: z.string().uuid().optional(),
  name: z.string().min(1, 'El nombre del grupo de atributos es requerido').max(100, 'Máximo 100 caracteres'),
  slug: z
    .string()
    .min(1, 'El slug es requerido')
    .regex(SLUG_REGEX, 'El slug debe estar en minúsculas y separado por guiones (ej: talla-calzado)')
    .max(100),
  swatch_type: catalogSwatchTypeSchema.default('pill'),
  display_type: catalogSwatchTypeSchema.optional(),
  type: catalogSwatchTypeSchema.optional(),
  options: z.array(catalogAttributeOptionSchema).min(1, 'Debe incluir al menos una opción en el grupo de atributos'),
  order_index: z.number().int().min(0).default(0).optional(),
  is_active: z.boolean().default(true).optional(),
});

// ------------------------------------------------------------------------------
// 4. VARIANT SCHEMA
// ------------------------------------------------------------------------------

export const catalogPriceModifierTypeSchema = z.enum([
  'fixed',
  'offset',
  'percentage',
  'absolute',
  'offset_fixed',
  'offset_percentage',
]);

export const catalogVariantSchema = z.object({
  id: z.string().min(1).default(generateFallbackUUID),
  catalog_item_id: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  title: z.string().min(1, 'El título de la variante es requerido').max(200, 'Máximo 200 caracteres'),
  name: z.string().max(200).optional(),
  sku: z.string().max(100, 'El SKU no puede exceder 100 caracteres').optional().nullable(),
  barcode: z.string().max(100, 'El código de barras no puede exceder 100 caracteres').optional().nullable(),
  price_modifier: z.number().default(0),
  price_type: catalogPriceModifierTypeSchema.default('fixed'),
  price_modifier_type: catalogPriceModifierTypeSchema.optional(),
  price_override: z.number().nonnegative('El precio de anulación no puede ser negativo').optional().nullable(),
  price: z.number().nonnegative().optional(),
  compare_at_price: z.number().nonnegative('El precio de comparación no puede ser negativo').optional().nullable(),
  inventory_quantity: z.number().int('La cantidad de inventario debe ser un número entero').default(0),
  stock_quantity: z.number().int().optional().nullable(),
  track_inventory: z.boolean().default(false),
  track_stock: z.boolean().optional(),
  allow_backorders: z.boolean().default(false),
  image_url: z.string().optional().nullable(),
  attributes: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.any())])).default({}), // e.g. { "Color": "Azul", "Talla": "M" }
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  order_index: z.number().int().min(0).default(0),
  metadata: z.record(z.string(), z.any()).default({}),
});

// ------------------------------------------------------------------------------
// 5. ADD-ON OPTIONS & GROUPS SCHEMAS
// ------------------------------------------------------------------------------

export const catalogAddonOptionSchema = z.object({
  id: z.string().min(1).default(generateFallbackUUID),
  name: z.string().min(1, 'El nombre del adicional es requerido').max(150, 'Máximo 150 caracteres'),
  description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional().nullable(),
  price: z.number().optional(),
  price_delta: z.number().default(0),
  price_type: z.enum(['fixed', 'percentage', 'per_unit']).default('fixed'),
  is_default: z.boolean().default(false),
  sku_suffix: z.string().max(50).optional().nullable(),
  image_url: z.string().optional().nullable(),
  order_index: z.number().int().min(0).default(0),
});

export const catalogAddonGroupSchema = z
  .object({
    id: z.string().min(1).default(generateFallbackUUID),
    organization_id: z.string().uuid().optional(),
    name: z.string().min(1, 'El nombre del grupo de adicionales es requerido').max(150, 'Máximo 150 caracteres'),
    description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional().nullable(),
    selection_type: z.enum(['single', 'multiple']).default('multiple'),
    is_required: z.boolean().default(false),
    min_selections: z.number().int().min(0, 'El mínimo de selecciones no puede ser negativo').default(0),
    max_selections: z.number().int().min(1, 'El máximo de selecciones debe ser al menos 1').default(MAX_ADDON_OPTIONS_PER_GROUP),
    options: z
      .array(catalogAddonOptionSchema)
      .min(1, 'Debe incluir al menos una opción en el grupo de adicionales')
      .max(MAX_ADDON_OPTIONS_PER_GROUP, `Máximo ${MAX_ADDON_OPTIONS_PER_GROUP} opciones por grupo`),
    order_index: z.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.min_selections > data.max_selections) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['min_selections'],
        message: 'El mínimo de selecciones no puede ser mayor que el máximo permitido',
      });
    }
    if (data.is_required && data.min_selections === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['min_selections'],
        message: 'Un grupo obligatorio debe exigir al menos 1 selección mínima',
      });
    }
    if (data.selection_type === 'single' && data.max_selections > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_selections'],
        message: 'Para selección única, el máximo de selecciones debe ser 1',
      });
    }
  });

// ------------------------------------------------------------------------------
// 6. SPECIFICATION TABS & BADGES SCHEMAS
// ------------------------------------------------------------------------------

export const catalogBadgeSchema = z.object({
  id: z.string().min(1).default(generateFallbackUUID),
  type: z.enum(['featured', 'new', 'low_stock', 'discount', 'custom']).default('custom'),
  label: z.string().min(1, 'El texto del badge es requerido').max(50, 'Máximo 50 caracteres'),
  color: z.string().optional().nullable(),
  bg_color: z.string().optional().nullable(),
  text_color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

export const catalogSpecTabSchema = z.object({
  id: z.string().min(1).default(generateFallbackUUID),
  title: z.string().min(1, 'El título de la pestaña es requerido').max(100, 'Máximo 100 caracteres'),
  content: z.string().default(''),
  type: z.enum(['text', 'bullets', 'table', 'key_value']).default('text'),
  items: z.array(z.string()).optional().default([]),
  key_values: z.record(z.string(), z.string()).optional().default({}),
  order_index: z.number().int().min(0).default(0),
  is_enabled: z.boolean().default(true),
});

export const catalogSeoMetadataSchema = z.object({
  meta_title: z.string().max(100, 'El meta título no puede exceder 100 caracteres').optional().nullable(),
  meta_description: z.string().max(255, 'La meta descripción no puede exceder 255 caracteres').optional().nullable(),
  search_tags: z.array(z.string().max(50)).default([]),
  og_image_url: z.string().url('URL de imagen OG inválida').optional().nullable().or(z.literal('')),
});

// ------------------------------------------------------------------------------
// 7. UNIVERSAL CATALOG ITEM SCHEMA
// ------------------------------------------------------------------------------

export const universalCatalogItemSchema = z
  .object({
    // Core Universal (Backwards compatible)
    id: z.string().uuid('ID de item inválido'),
    organization_id: z.string().uuid('ID de organización inválido'),
    name: z.string().min(1, 'El nombre del producto/servicio es requerido').max(200, 'Máximo 200 caracteres'),
    description: z.string().max(5000, 'La descripción no puede exceder 5000 caracteres').optional().nullable().default(''),
    category_id: z.string().uuid().optional().nullable(),
    category: z.string().min(1, 'La categoría es requerida').max(100, 'Máximo 100 caracteres'),
    base_price: z.number().nonnegative('El precio base no puede ser negativo').default(0),
    compare_at_price: z.number().nonnegative('El precio de comparación no puede ser negativo').optional().nullable(),
    type: legacyServiceTypeSchema.default('one_off'),
    classification: catalogItemClassificationSchema.default('service'),
    frequency: billingFrequencySchema.optional().nullable(),
    image_url: z.string().optional().nullable(),
    gallery_images: catalogGalleryImagesArraySchema.default([]),
    images: catalogGalleryImagesArraySchema.optional(),
    video_url: z.string().url('URL de video inválida').optional().nullable().or(z.literal('')),
    sku: z.string().max(100, 'El SKU no puede exceder 100 caracteres').optional().nullable(),
    barcode: z.string().max(100, 'El código de barras no puede exceder 100 caracteres').optional().nullable(),
    inventory_quantity: z.number().int('La cantidad de inventario debe ser un entero').default(0),
    stock_quantity: z.number().int().optional().nullable(),
    track_inventory: z.boolean().default(false),
    track_stock: z.boolean().optional(),
    allow_backorders: z.boolean().default(false),
    low_stock_threshold: z.number().int().min(0).default(5),
    has_variants: z.boolean().default(false),
    variant_attributes: z.array(catalogAttributeGroupSchema).default([]),
    variants: z
      .array(catalogVariantSchema)
      .max(MAX_VARIANTS_PER_ITEM, `Máximo ${MAX_VARIANTS_PER_ITEM} variantes permitidas por item`)
      .default([]),
    variants_config: z.record(z.string(), z.any()).optional(),
    addon_groups: z.array(catalogAddonGroupSchema).default([]),
    add_ons: z.union([z.array(catalogAddonGroupSchema), z.record(z.string(), z.any())]).optional(),
    badges: z.array(z.string().max(50)).default([]),
    structured_badges: z.array(catalogBadgeSchema).optional().default([]),
    featured_badge: z.string().optional().nullable(),
    specifications: z.record(z.string(), z.any()).default({}),
    specs_tabs: z.array(catalogSpecTabSchema).optional(),
    spec_tabs: z.union([z.array(catalogSpecTabSchema), z.record(z.string(), z.boolean())]).optional(),
    seo_title: z.string().optional().nullable(),
    seo_description: z.string().optional().nullable(),
    seo_metadata: catalogSeoMetadataSchema.default({ search_tags: [] }),
    classification_metadata: classificationMetadataSchema.optional().default({}),
    physical_details: physicalMetadataSchema.optional(),
    digital_details: digitalMetadataSchema.optional(),
    service_details: serviceMetadataSchema.optional(),
    subscription_details: subscriptionMetadataSchema.optional(),
    is_visible_in_portal: z.boolean().default(true),
    is_active: z.boolean().default(true),
    order_index: z.number().int().optional(),
    cta_type: z.enum(['whatsapp', 'buy', 'info', 'quote', 'appointment', 'portfolio', 'add_to_cart', 'cart', 'booking']).default('whatsapp'),
    price_label_type: z.enum(['price', 'base_price', 'from']).default('price'),
    is_system_template: z.boolean().optional().nullable(),
    ai_generated_image: z.boolean().optional().nullable(),
    insights_access: z.string().optional().nullable(),
    service_start_date: z.string().optional().nullable(),
    billing_cycle_start_date: z.string().optional().nullable(),
    briefing_template_id: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.any()).default({}),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Valida que el precio de comparación no sea menor que el precio base
    if (data.compare_at_price !== undefined && data.compare_at_price !== null) {
      if (data.compare_at_price < data.base_price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['compare_at_price'],
          message: 'El precio original de comparación debe ser mayor o igual al precio actual',
        });
      }
    }

    // Valida frecuencia cuando la clasificación es suscripción
    if (data.classification === 'subscription' && !data.frequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['frequency'],
        message: 'Los items de suscripción requieren especificar una frecuencia de cobro',
      });
    }

    // Valida que si tiene variantes activadas existan grupos de atributos o variantes definidas
    if (data.has_variants && data.variants.length === 0 && data.variant_attributes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['has_variants'],
        message: 'Debe configurar al menos un atributo o variante cuando la opción de variantes está habilitada',
      });
    }
  });

// ------------------------------------------------------------------------------
// 8. CREATE & UPDATE ITEM SCHEMAS (Server Action Inputs)
// ------------------------------------------------------------------------------

export const createCatalogItemSchema = universalCatalogItemSchema
  .omit({
    id: true,
    organization_id: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
  })
  .extend({
    id: z.string().uuid().optional(),
    organization_id: z.string().uuid().optional(),
  });

export const updateCatalogItemSchema = createCatalogItemSchema
  .partial()
  .extend({
    id: z.string().uuid('ID de item inválido requerido para actualizar').optional(),
  });

// ------------------------------------------------------------------------------
// 9. STOREFRONT MULTI-CHANNEL ACTION PAYLOADS
// ------------------------------------------------------------------------------

export const storefrontCustomerContactSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150, 'Máximo 150 caracteres'),
  email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
  phone: z.string().min(7, 'Número de teléfono o WhatsApp inválido (mínimo 7 dígitos)').max(25),
  company_name: z.string().max(150).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional().nullable(),
});

export const storefrontSelectedAddonSchema = z.object({
  groupId: z.string().min(1, 'ID del grupo de adicional requerido'),
  optionId: z.string().min(1, 'ID de la opción de adicional requerido'),
  name: z.string().min(1, 'Nombre del adicional requerido'),
  priceDelta: z.number().default(0),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0').default(1),
});

export const storefrontActionTypeSchema = z.enum([
  'whatsapp',
  'quote',
  'wompi',
  'appointment',
  'cart',
  'add_to_cart',
  'whatsapp_checkout',
  'quote_request',
  'wompi_checkout',
  'appointment_booking',
]);

export const storefrontActionPayloadSchema = z
  .object({
    actionType: storefrontActionTypeSchema.optional().default('whatsapp_checkout'),
    itemId: z.string().min(1, 'El ID del item es requerido'),
    variantId: z.string().optional().nullable(),
    selectedVariant: catalogVariantSchema.optional().nullable(),
    selectedAddons: z.array(storefrontSelectedAddonSchema).default([]),
    calculatedTotalPrice: z.number().nonnegative('El precio total calculado no puede ser negativo'),
    quantity: z.number().int().positive('La cantidad debe ser al menos 1').default(1),
    customerInfo: storefrontCustomerContactSchema.optional(),
    deepLinkUrl: z
      .string()
      .min(1, 'La URL de enlace profundo es requerida')
      .refine((val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'), {
        message: 'La URL debe ser un enlace web o ruta relativa válida',
      }),
    portalToken: z.string().optional().nullable(),
    sourcePortalToken: z.string().optional(),
    organizationId: z.string().uuid().optional().nullable(),
    currency: z.string().max(5).default('COP'),
    appointmentDetails: z
      .object({
        date: z.string().optional(),
        timeSlot: z.string().optional(),
        staffId: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Si la acción es solicitud de cotización o checkout, requerir contacto
    if (
      (data.actionType === 'quote_request' ||
        data.actionType === 'wompi_checkout' ||
        data.actionType === 'quote' ||
        data.actionType === 'wompi') &&
      !data.customerInfo
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerInfo'],
        message: 'La información del cliente es obligatoria para esta acción',
      });
    }
  });

// ------------------------------------------------------------------------------
// 10. STOREFRONT THEME & CUSTOMIZER SCHEMAS
// ------------------------------------------------------------------------------

export const storefrontFaqItemSchema = z.object({
  id: z.string().min(1).default(generateFallbackUUID).optional(),
  question: z.string().min(1, 'La pregunta es requerida').max(255),
  answer: z.string().min(1, 'La respuesta es requerida').max(2000),
  category: z.string().max(100).optional().nullable(),
});

export const storefrontTestimonialItemSchema = z.object({
  id: z.string().min(1).default(generateFallbackUUID).optional(),
  name: z.string().min(1, 'El nombre es requerido').max(100),
  role: z.string().max(100).optional().nullable(),
  company: z.string().max(100).optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  quote: z.string().min(1, 'El testimonio es requerido').max(1000),
  rating: z.number().int().min(1).max(5).default(5).optional(),
});

export const storefrontHeroSlideSchema = z.object({
  id: z.string().min(1).default(generateFallbackUUID),
  image_url: z.string().default(''),
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  badge_text: z.string().optional().nullable(),
  cta_text: z.string().optional().nullable(),
  cta_url: z.string().optional().nullable(),
  link_url: z.string().optional().nullable(),
});

export const storefrontHeroSchema = z.object({
  enabled: z.boolean().default(true),
  background_type: z.enum(['gradient', 'image', 'slideshow']).default('gradient').optional(),
  title: z.string().optional().default('Descubre Nuestras Soluciones'),
  subtitle: z.string().optional().default('Calidad superior, innovación y servicio personalizado.'),
  cta_text: z.string().optional().default('Explorar Catálogo'),
  cta_url: z.string().optional().default('#catalog'),
  cta_enabled: z.boolean().default(true).optional(),
  whatsapp_cta_enabled: z.boolean().default(true).optional(),
  whatsapp_cta_text: z.string().default('WhatsApp Directo').optional(),
  bg_gradient: z.string().default('from-indigo-900 via-slate-900 to-black').optional(),
  bg_image_url: z.string().optional().nullable(),
  slides: z.array(storefrontHeroSlideSchema).default([]).optional(),
  slide_interval: z.number().int().positive().default(5000).optional(),
  badge_text: z.string().default('Portafolio 2026').optional(),
  text_align: z.enum(['left', 'center', 'right']).default('center').optional(),
  hide_text: z.boolean().default(false).optional(),
  overlay_opacity: z.number().min(0).max(100).default(40).optional(),
  banner_height: z.enum(['compact', 'medium', 'tall', 'full']).default('medium').optional(),
});

export const storefrontThemeConfigSchema = z.object({
  theme: z
    .enum([
      'modern',
      'minimal',
      'dark_luxe',
      'vibrant',
      'editorial',
      'neo_brutalist',
      'swiss',
      'modern_glass',
      'gourmet_elegance',
      'cyber_glass_3d',
    ])
    .default('modern'),
  theme_id: z.string().optional(),
  primary_color: z.string().regex(HEX_COLOR_REGEX, 'Color primario inválido').default('#4F46E5'),
  secondary_color: z.string().regex(HEX_COLOR_REGEX, 'Color secundario inválido').default('#EC4899'),
  accent_color: z.string().regex(HEX_COLOR_REGEX, 'Color de acento inválido').default('#10B981'),
  color_mode: z.enum(['dark', 'light', 'auto']).default('auto'),
  background_style: z.enum(['solid', 'gradient', 'mesh', 'mesh_3d']).default('solid'),
  primary_cta: z.enum(['whatsapp', 'cart', 'buy', 'quote', 'booking']).default('whatsapp').optional(),
  hero: storefrontHeroSchema.default({
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
  }),
  navigation_style: z
    .enum(['pills', 'tabs', 'sidebar', 'grid', 'glass_cards', 'underline_tabs', 'floating_dock'])
    .default('pills'),
  category_nav_style: z.string().optional(),
  card_layout: z.enum(['grid', 'masonry', 'list']).default('grid'),
  enable_search: z.boolean().default(true),
  enable_whatsapp_checkout: z.boolean().default(true),
  enable_quote_request: z.boolean().default(true),
  enable_qr_code: z.boolean().default(true),
  faq: z.array(storefrontFaqItemSchema).default([]),
  testimonials: z.array(storefrontTestimonialItemSchema).default([]),
  social_links: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      tiktok: z.string().optional(),
      whatsapp: z.string().optional(),
      website: z.string().optional(),
      google_maps: z.string().optional(),
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      youtube: z.string().optional(),
    })
    .optional(),
  business_hours: z.record(z.string(), z.string()).default({
    monday_friday: '08:00 - 18:00',
    saturday: '09:00 - 14:00',
    sunday: 'Cerrado',
  }),
  business_hours_text: z.string().optional(),
});

// ------------------------------------------------------------------------------
// 11. AI COPYWRITER & QR ACTION INPUT SCHEMAS
// ------------------------------------------------------------------------------

export const generateAICopyInputSchema = z.object({
  name: z.string().min(1, 'El nombre del item es requerido para generar la copia con IA'),
  category: z.string().optional(),
  classification: catalogItemClassificationSchema.optional().default('service'),
  tone: z.enum(['professional', 'persuasive', 'casual', 'luxury', 'technical']).default('persuasive'),
  currentDescription: z.string().optional(),
  keywords: z.array(z.string()).optional().default([]),
});

export const generateAICopyOutputSchema = z.object({
  title_suggestions: z.array(z.string()),
  description: z.string(),
  bullet_points: z.array(z.string()),
  seo: z.object({
    meta_title: z.string(),
    meta_description: z.string(),
    search_tags: z.array(z.string()),
  }),
});

export const generateQRCodeInputSchema = z.object({
  itemId: z.string().min(1, 'ID de item requerido'),
  portalToken: z.string().min(1, 'Token del portal requerido'),
  variantId: z.string().optional().nullable(),
  size: z.number().int().min(128).max(1024).default(256),
  includeLogo: z.boolean().default(true),
});

// ------------------------------------------------------------------------------
// 12. INFERRED TYPESCRIPT TYPES
// ------------------------------------------------------------------------------

export type CatalogGalleryImageInput = z.infer<typeof catalogGalleryImageSchema>;
export type CatalogItemClassification = z.infer<typeof catalogItemClassificationSchema>;
export type LegacyServiceType = z.infer<typeof legacyServiceTypeSchema>;
export type BillingFrequency = z.infer<typeof billingFrequencySchema>;

export type PhysicalMetadata = z.infer<typeof physicalMetadataSchema>;
export type DigitalMetadata = z.infer<typeof digitalMetadataSchema>;
export type ServiceMetadata = z.infer<typeof serviceMetadataSchema>;
export type SubscriptionMetadata = z.infer<typeof subscriptionMetadataSchema>;
export type ClassificationMetadata = z.infer<typeof classificationMetadataSchema>;

export type CatalogSwatchType = z.infer<typeof catalogSwatchTypeSchema>;
export type CatalogAttributeOptionInput = z.infer<typeof catalogAttributeOptionSchema>;
export type CatalogAttributeGroupInput = z.infer<typeof catalogAttributeGroupSchema>;

export type CatalogPriceModifierType = z.infer<typeof catalogPriceModifierTypeSchema>;
export type CatalogVariantInput = z.infer<typeof catalogVariantSchema>;

export type CatalogAddonOptionInput = z.infer<typeof catalogAddonOptionSchema>;
export type CatalogAddonGroupInput = z.infer<typeof catalogAddonGroupSchema>;

export type CatalogBadgeInput = z.infer<typeof catalogBadgeSchema>;
export type CatalogSpecTabInput = z.infer<typeof catalogSpecTabSchema>;
export type CatalogSeoMetadataInput = z.infer<typeof catalogSeoMetadataSchema>;

export type UniversalCatalogItemInput = z.infer<typeof universalCatalogItemSchema>;
export type CreateCatalogItemInput = z.infer<typeof createCatalogItemSchema>;
export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemSchema>;

export type StorefrontCustomerContactInput = z.infer<typeof storefrontCustomerContactSchema>;
export type StorefrontSelectedAddonInput = z.infer<typeof storefrontSelectedAddonSchema>;
export type StorefrontActionPayloadInput = z.infer<typeof storefrontActionPayloadSchema>;

export type StorefrontFaqItemInput = z.infer<typeof storefrontFaqItemSchema>;
export type StorefrontTestimonialItemInput = z.infer<typeof storefrontTestimonialItemSchema>;
export type StorefrontThemeConfigInput = z.infer<typeof storefrontThemeConfigSchema>;

export type GenerateAICopyInput = z.infer<typeof generateAICopyInputSchema>;
export type GenerateAICopyOutput = z.infer<typeof generateAICopyOutputSchema>;
export type GenerateQRCodeInput = z.infer<typeof generateQRCodeInputSchema>;
