/**
 * Universal Multi-Industry Catalog & Premium Storefront Portal
 * E2E Test Harness - Unified Mock Data & Fixtures
 */

import {
  UniversalCatalogItem,
  CatalogGalleryImage,
  CatalogAttributeGroup,
  CatalogVariant,
  CatalogAddonGroup,
  StorefrontActionPayload,
  StoreCustomizerTheme,
} from './contracts';

export const TENANT_A_ID = 'tenant-org-alpha-1001';
export const TENANT_B_ID = 'tenant-org-beta-2002';

// -------------------------------------------------------------
// Tier 1 Base Fixtures & Attribute Groups
// -------------------------------------------------------------

export const mockPhysicalGallery: CatalogGalleryImage[] = [
  {
    id: 'img_phys_01',
    url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518',
    is_cover: true,
    order_index: 0,
    alt_text: 'Camiseta Premium Vista Frontal',
    width: 1200,
    height: 1200,
  },
  {
    id: 'img_phys_02',
    url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c',
    is_cover: false,
    order_index: 1,
    alt_text: 'Camiseta Premium Vista Trasera',
    width: 1200,
    height: 1200,
  },
  {
    id: 'img_phys_03',
    url: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9',
    is_cover: false,
    order_index: 2,
    alt_text: 'Detalle de Cuello y Costuras',
    width: 1200,
    height: 1200,
  },
  {
    id: 'img_phys_04',
    url: 'https://images.unsplash.com/photo-1562157873-818bc0726f68',
    is_cover: false,
    order_index: 3,
    alt_text: 'Textura de Tela 100% Algodón Peinado',
    width: 1200,
    height: 1200,
  },
  {
    id: 'img_phys_05',
    url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a',
    is_cover: false,
    order_index: 4,
    alt_text: 'Modelo Vista Lateral',
    width: 1200,
    height: 1200,
  },
  {
    id: 'img_phys_06',
    url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27',
    is_cover: false,
    order_index: 5,
    alt_text: 'Modelo Vista Frontal en Exterior',
    width: 1200,
    height: 1200,
  },
  {
    id: 'img_phys_07',
    url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990',
    is_cover: false,
    order_index: 6,
    alt_text: 'Empaque Sostenible Reciclable',
    width: 1200,
    height: 1200,
  },
  {
    id: 'img_phys_08',
    url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633',
    is_cover: false,
    order_index: 7,
    alt_text: 'Certificación Textil Ecológica',
    width: 1200,
    height: 1200,
  },
];

export const mockColorAttributeGroup: CatalogAttributeGroup = {
  id: 'attr_color',
  organization_id: TENANT_A_ID,
  name: 'Color',
  slug: 'color',
  swatch_type: 'color',
  options: [
    { id: 'opt_col_blk', label: 'Negro Azabache', value: 'Negro Azabache', swatch_type: 'color', swatch_value: '#111111', order_index: 0 },
    { id: 'opt_col_wht', label: 'Blanco Hueso', value: 'Blanco Hueso', swatch_type: 'color', swatch_value: '#F5F5F0', order_index: 1 },
    { id: 'opt_col_nvy', label: 'Azul Marino', value: 'Azul Marino', swatch_type: 'color', swatch_value: '#1E3A8A', order_index: 2 },
  ],
};

export const mockSizeAttributeGroup: CatalogAttributeGroup = {
  id: 'attr_size',
  organization_id: TENANT_A_ID,
  name: 'Talla',
  slug: 'talla',
  swatch_type: 'pill',
  options: [
    { id: 'opt_sz_s', label: 'S', value: 'S', swatch_type: 'pill', order_index: 0 },
    { id: 'opt_sz_m', label: 'M', value: 'M', swatch_type: 'pill', order_index: 1 },
    { id: 'opt_sz_l', label: 'L', value: 'L', swatch_type: 'pill', order_index: 2 },
    { id: 'opt_sz_xl', label: 'XL', value: 'XL', swatch_type: 'pill', order_index: 3 },
  ],
};

export const mockPhysicalVariants: CatalogVariant[] = [
  { id: 'var_01', catalog_item_id: 'item_phys_001', title: 'Negro Azabache / S', sku: 'TSH-BLACK-S', price_modifier: 0, price_type: 'offset', inventory_quantity: 20, track_inventory: true, attributes: { Color: 'Negro Azabache', Talla: 'S' }, is_active: true },
  { id: 'var_02', catalog_item_id: 'item_phys_001', title: 'Negro Azabache / M', sku: 'TSH-BLACK-M', price_modifier: 0, price_type: 'offset', inventory_quantity: 20, track_inventory: true, attributes: { Color: 'Negro Azabache', Talla: 'M' }, is_active: true },
  { id: 'var_03', catalog_item_id: 'item_phys_001', title: 'Negro Azabache / L', sku: 'TSH-BLACK-L', price_modifier: 0, price_type: 'offset', inventory_quantity: 20, track_inventory: true, attributes: { Color: 'Negro Azabache', Talla: 'L' }, is_active: true },
  { id: 'var_04', catalog_item_id: 'item_phys_001', title: 'Negro Azabache / XL', sku: 'TSH-BLACK-XL', price_modifier: 5000, price_type: 'offset', inventory_quantity: 15, track_inventory: true, attributes: { Color: 'Negro Azabache', Talla: 'XL' }, is_active: true },
  { id: 'var_05', catalog_item_id: 'item_phys_001', title: 'Blanco Hueso / S', sku: 'TSH-WHITE-S', price_modifier: 0, price_type: 'offset', inventory_quantity: 15, track_inventory: true, attributes: { Color: 'Blanco Hueso', Talla: 'S' }, is_active: true },
  { id: 'var_06', catalog_item_id: 'item_phys_001', title: 'Blanco Hueso / M', sku: 'TSH-WHITE-M', price_modifier: 0, price_type: 'offset', inventory_quantity: 15, track_inventory: true, attributes: { Color: 'Blanco Hueso', Talla: 'M' }, is_active: true },
  { id: 'var_07', catalog_item_id: 'item_phys_001', title: 'Blanco Hueso / L', sku: 'TSH-WHITE-L', price_modifier: 0, price_type: 'offset', inventory_quantity: 15, track_inventory: true, attributes: { Color: 'Blanco Hueso', Talla: 'L' }, is_active: true },
  { id: 'var_08', catalog_item_id: 'item_phys_001', title: 'Blanco Hueso / XL', sku: 'TSH-WHITE-XL', price_modifier: 5000, price_type: 'offset', inventory_quantity: 15, track_inventory: true, attributes: { Color: 'Blanco Hueso', Talla: 'XL' }, is_active: true },
  { id: 'var_09', catalog_item_id: 'item_phys_001', title: 'Azul Marino / S', sku: 'TSH-NAVY-S', price_modifier: 0, price_type: 'offset', inventory_quantity: 12, track_inventory: true, attributes: { Color: 'Azul Marino', Talla: 'S' }, is_active: true },
  { id: 'var_10', catalog_item_id: 'item_phys_001', title: 'Azul Marino / M', sku: 'TSH-NAVY-M', price_modifier: 0, price_type: 'offset', inventory_quantity: 13, track_inventory: true, attributes: { Color: 'Azul Marino', Talla: 'M' }, is_active: true },
  { id: 'var_11', catalog_item_id: 'item_phys_001', title: 'Azul Marino / L', sku: 'TSH-NAVY-L', price_modifier: 0, price_type: 'offset', inventory_quantity: 12, track_inventory: true, attributes: { Color: 'Azul Marino', Talla: 'L' }, is_active: true },
  { id: 'var_12', catalog_item_id: 'item_phys_001', title: 'Azul Marino / XL', sku: 'TSH-NAVY-XL', price_modifier: 5000, price_type: 'offset', inventory_quantity: 0, track_inventory: true, attributes: { Color: 'Azul Marino', Talla: 'XL' }, is_active: false },
];

export const mockPackagingAddonGroup: CatalogAddonGroup = {
  id: 'addon_pkg',
  name: 'Empaque para Regalo',
  selection_type: 'single',
  is_required: true,
  options: [
    { id: 'opt_pkg_std', name: 'Bolsa Ecológica Kraft', price_delta: 0, is_default: true },
    { id: 'opt_pkg_lux', name: 'Caja Rígida de Lujo con Cinta', price_delta: 15000, is_default: false, sku_suffix: 'LUX-BOX' },
  ],
};

export const mockCustomizationAddonGroup: CatalogAddonGroup = {
  id: 'addon_custom',
  name: 'Personalización',
  selection_type: 'multiple',
  is_required: false,
  min_selections: 0,
  max_selections: 2,
  options: [
    { id: 'opt_emb_chest', name: 'Iniciales en el pecho (hasta 3 letras)', price_delta: 12000, is_default: false },
    { id: 'opt_emb_sleeve', name: 'Logo en manga', price_delta: 8000, is_default: false },
  ],
};

// 1. Physical Catalog Item (Tier 1)
export const mockPhysicalItem: UniversalCatalogItem = {
  id: 'item_phys_001',
  organization_id: TENANT_A_ID,
  name: 'Camiseta Premium Oversize Minimalist',
  description: 'Camiseta confeccionada en 100% algodón peinado pesado (240 GSM) con fit contemporáneo y acabados de alta costura.',
  category_id: 'cat_menswear',
  category: 'Ropa Masculina',
  base_price: 85000,
  compare_at_price: 110000,
  type: 'product',
  classification: 'physical',
  image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518',
  gallery_images: mockPhysicalGallery,
  video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  sku: 'TSHIRT-OVR-001',
  barcode: '7701234567890',
  inventory_quantity: 150,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 20,
  has_variants: true,
  variant_attributes: [mockColorAttributeGroup, mockSizeAttributeGroup],
  variants: mockPhysicalVariants,
  addon_groups: [mockPackagingAddonGroup, mockCustomizationAddonGroup],
  badges: ['Destacado', 'Novedad'],
  specifications: {
    features: ['100% Algodón Peinado 240 GSM', 'Tejido pre-encogido anti-motas', 'Cuello reforzado en rib 1x1'],
    deliverables: ['Envío express 24h a ciudades principales', 'Garantía de satisfacción de 30 días'],
    warranty: 'Garantía de confección por 90 días.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T10:00:00Z',
};

// 2. Digital Catalog Item (Tier 1)
export const mockDigitalItem: UniversalCatalogItem = {
  id: 'item_dig_002',
  organization_id: TENANT_A_ID,
  name: 'Kit de UI/UX Design System Pro en Figma',
  description: 'Más de 500 componentes listos para producción con auto-layout 5.0, variables semánticas y modo oscuro.',
  category_id: 'cat_digital_assets',
  category: 'Recursos Digitales',
  base_price: 149000,
  compare_at_price: 220000,
  type: 'product',
  classification: 'digital',
  image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
  gallery_images: [
    { id: 'img_dig_01', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe', is_cover: true, order_index: 0 },
  ],
  sku: 'DIG-FGM-DS-01',
  inventory_quantity: 99999,
  track_inventory: false,
  allow_backorders: true,
  low_stock_threshold: 0,
  has_variants: false,
  variant_attributes: [],
  variants: [],
  addon_groups: [],
  badges: ['Destacado', 'Descuento'],
  specifications: {
    deliverables: ['Descarga instantánea de archivos .ZIP y enlace a Figma Community', 'Actualizaciones de por vida'],
    license: 'Licencia comercial para proyectos ilimitados',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-02T10:00:00Z',
};

// 3. Service Catalog Item (Tier 1)
export const mockServiceItem: UniversalCatalogItem = {
  id: 'item_srv_003',
  organization_id: TENANT_A_ID,
  name: 'Consultoría & Branding Estratégico Corporativo',
  description: 'Auditoría de marca, diseño de identidad visual, manual de normas y estrategia de posicionamiento omnicanal.',
  category_id: 'cat_agency_services',
  category: 'Servicios de Consultoría',
  base_price: 3200000,
  type: 'one_off',
  classification: 'service',
  image_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0',
  gallery_images: [
    { id: 'img_srv_01', url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0', is_cover: true, order_index: 0 },
  ],
  sku: 'SRV-BRAND-PRO',
  inventory_quantity: 3,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 1,
  has_variants: false,
  variant_attributes: [],
  variants: [],
  addon_groups: [],
  badges: ['Pocas Unidades'],
  specifications: {
    deliverables: ['Brand Guidelines PDF interactivo', 'Archivos vectoriales (.AI, .SVG, .PDF)', 'Plantillas de redes sociales en Canva'],
    sla: 'Primera entrega de propuestas en 5 días hábiles',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-03T10:00:00Z',
};

// 4. Subscription Catalog Item (Tier 1)
export const mockSubscriptionItem: UniversalCatalogItem = {
  id: 'item_sub_004',
  organization_id: TENANT_A_ID,
  name: 'Pixy Cloud ERP & Facturación Electrónica DIAN',
  description: 'Suscripción mensual al software ERP en la nube para automatización contable, inventarios y nómina electrónica.',
  category_id: 'cat_saas',
  category: 'Software Cloud',
  base_price: 180000,
  compare_at_price: 240000,
  type: 'recurring',
  classification: 'subscription',
  frequency: 'monthly',
  image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
  gallery_images: [
    { id: 'img_sub_01', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71', is_cover: true, order_index: 0 },
  ],
  sku: 'SUB-ERP-MO',
  inventory_quantity: 99999,
  track_inventory: false,
  allow_backorders: true,
  low_stock_threshold: 0,
  has_variants: false,
  variant_attributes: [],
  variants: [],
  addon_groups: [],
  badges: ['Destacado', 'Descuento'],
  specifications: {
    terms: 'Facturación recurrente mensual cancelable en cualquier momento.',
    sla: 'Disponibilidad de plataforma 99.9% uptime SLA.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-04T10:00:00Z',
};

// 5. Tenant B Private Item (Tier 1)
export const mockTenantBItem: UniversalCatalogItem = {
  id: 'item_tenant_b_999',
  organization_id: TENANT_B_ID,
  name: 'Tenant B Private Item',
  description: 'Artículo privado de otra organización protegido por Row Level Security (RLS).',
  category_id: 'cat_tenant_b',
  category: 'Privado',
  base_price: 500000,
  type: 'product',
  classification: 'physical',
  image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
  gallery_images: [
    { id: 'img_tb_01', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e', is_cover: true, order_index: 0 },
  ],
  sku: 'TB-PRIV-001',
  inventory_quantity: 10,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 2,
  has_variants: false,
  variant_attributes: [],
  variants: [],
  addon_groups: [],
  badges: [],
  specifications: {},
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T12:00:00Z',
};

export const allMockCatalogItems: UniversalCatalogItem[] = [
  mockPhysicalItem,
  mockDigitalItem,
  mockServiceItem,
  mockSubscriptionItem,
  mockTenantBItem,
];

export const mockStorefrontActionPayload: StorefrontActionPayload = {
  itemId: 'item_phys_001',
  variantId: 'var_01',
  selectedVariant: mockPhysicalVariants[0],
  selectedAddons: [
    { groupId: 'addon_pkg', optionId: 'opt_pkg_lux', name: 'Caja Rígida de Lujo con Cinta', priceDelta: 15000 },
    { groupId: 'addon_custom', optionId: 'opt_emb_chest', name: 'Iniciales en el pecho (hasta 3 letras)', priceDelta: 12000 },
  ],
  calculatedTotalPrice: 112000, // 85000 + 0 (var_01) + 15000 + 12000 = 112000 COP
  quantity: 1,
  customerInfo: {
    name: 'Carlos Mendoza',
    phone: '+57 300 123 4567',
    email: 'carlos.mendoza@example.com',
    notes: 'Por favor bordar las iniciales "CMG" con hilo plateado.',
  },
  deepLinkUrl: 'https://app.pixy.com/portal/preview?item=item_phys_001',
};

// -------------------------------------------------------------
// Tier 2–4 Realistic Datasets & Multi-Industry Fixtures
// -------------------------------------------------------------

// 1. Fashion Apparel (Tier 2-4)
export const mockFashionApparel: UniversalCatalogItem = {
  id: 'item-fashion-001',
  organization_id: TENANT_A_ID,
  name: 'Camisa Lino Premium Orgánica',
  description: 'Camisa confeccionada en 100% lino orgánico colombiano con botones de madera sostenible.',
  category_id: 'cat-fashion-menswear',
  category: 'Moda Masculina',
  base_price: 180000, // COP
  compare_at_price: 220000,
  type: 'product',
  classification: 'physical',
  image_url: 'https://cdn.pixy.app/demo/fashion-cover.webp',
  gallery_images: [
    { id: 'img-1', url: 'https://cdn.pixy.app/demo/fashion-cover.webp', is_cover: true, order_index: 0, alt_text: 'Frente' },
    { id: 'img-2', url: 'https://cdn.pixy.app/demo/fashion-back.webp', is_cover: false, order_index: 1, alt_text: 'Espalda' },
    { id: 'img-3', url: 'https://cdn.pixy.app/demo/fashion-detail.webp', is_cover: false, order_index: 2, alt_text: 'Detalle cuello' },
  ],
  sku: 'CAM-LINO-01',
  inventory_quantity: 45,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 10,
  has_variants: true,
  variant_attributes: [
    {
      id: 'attr-size',
      organization_id: TENANT_A_ID,
      name: 'Talla',
      slug: 'talla',
      swatch_type: 'pill',
      options: [
        { id: 'opt-s', label: 'S', value: 'S', swatch_type: 'pill', order_index: 0 },
        { id: 'opt-m', label: 'M', value: 'M', swatch_type: 'pill', order_index: 1 },
        { id: 'opt-l', label: 'L', value: 'L', swatch_type: 'pill', order_index: 2 },
      ],
    },
    {
      id: 'attr-color',
      organization_id: TENANT_A_ID,
      name: 'Color',
      slug: 'color',
      swatch_type: 'color',
      options: [
        { id: 'opt-white', label: 'Blanco Arena', value: 'Blanco Arena', swatch_type: 'color', swatch_value: '#F5F5DC', order_index: 0 },
        { id: 'opt-navy', label: 'Azul Marino', value: 'Azul Marino', swatch_type: 'color', swatch_value: '#000080', order_index: 1 },
      ],
    },
  ],
  variants: [
    {
      id: 'var-s-white',
      catalog_item_id: 'item-fashion-001',
      title: 'Talla S / Blanco Arena',
      sku: 'CAM-LINO-S-WHT',
      price_modifier: 0,
      price_type: 'offset',
      inventory_quantity: 12,
      track_inventory: true,
      image_url: 'https://cdn.pixy.app/demo/fashion-white.webp',
      attributes: { Talla: 'S', Color: 'Blanco Arena' },
      is_active: true,
    },
    {
      id: 'var-m-white',
      catalog_item_id: 'item-fashion-001',
      title: 'Talla M / Blanco Arena',
      sku: 'CAM-LINO-M-WHT',
      price_modifier: 0,
      price_type: 'offset',
      inventory_quantity: 15,
      track_inventory: true,
      image_url: 'https://cdn.pixy.app/demo/fashion-white.webp',
      attributes: { Talla: 'M', Color: 'Blanco Arena' },
      is_active: true,
    },
    {
      id: 'var-l-navy',
      catalog_item_id: 'item-fashion-001',
      title: 'Talla L / Azul Marino',
      sku: 'CAM-LINO-L-NVY',
      price_modifier: 15000, // +$15,000 COP for premium dyed navy
      price_type: 'offset',
      inventory_quantity: 4, // low stock!
      track_inventory: true,
      image_url: 'https://cdn.pixy.app/demo/fashion-navy.webp',
      attributes: { Talla: 'L', Color: 'Azul Marino' },
      is_active: true,
    },
  ],
  addon_groups: [
    {
      id: 'addon-grp-packaging',
      name: 'Empaque de Regalo',
      selection_type: 'single',
      is_required: false,
      options: [
        { id: 'opt-pkg-standard', name: 'Caja Kraft Eco (Gratis)', price_delta: 0, is_default: true },
        { id: 'opt-pkg-luxury', name: 'Estuche de Madera de Lujo grabado', price_delta: 35000, is_default: false, sku_suffix: 'LUX-BOX' },
      ],
    },
  ],
  badges: ['Destacado', 'Novedad'],
  specifications: {
    features: ['100% Lino Puro Certificado', 'Botones de tagua natural', 'Costuras reforzadas a mano'],
    deliverables: ['Envío express 24h a ciudades principales', 'Cambio de talla gratis en 30 días'],
    warranty: 'Garantía de confección por 6 meses.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T12:00:00Z',
};

// 2. B2B SaaS Subscriptions (Tier 2-4)
export const mockB2BSaaSSubscription: UniversalCatalogItem = {
  id: 'item-saas-002',
  organization_id: TENANT_A_ID,
  name: 'Pixy Cloud ERP Enterprise Suite',
  description: 'Plataforma integral de gestión empresarial con IA predictiva, CRM y facturación electrónica DIAN.',
  category_id: 'cat-digital-software',
  category: 'Software & Cloud',
  base_price: 350000, // Monthly base price COP
  compare_at_price: 450000,
  type: 'recurring',
  classification: 'subscription',
  frequency: 'monthly',
  image_url: 'https://cdn.pixy.app/demo/saas-dashboard.webp',
  gallery_images: [
    { id: 'saas-1', url: 'https://cdn.pixy.app/demo/saas-dashboard.webp', is_cover: true, order_index: 0 },
    { id: 'saas-2', url: 'https://cdn.pixy.app/demo/saas-crm-view.webp', is_cover: false, order_index: 1 },
  ],
  video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  sku: 'PIXY-ERP-SUB',
  inventory_quantity: 99999,
  track_inventory: false,
  allow_backorders: true,
  low_stock_threshold: 0,
  has_variants: true,
  variant_attributes: [
    {
      id: 'attr-plan-tier',
      organization_id: TENANT_A_ID,
      name: 'Plan',
      slug: 'plan',
      swatch_type: 'select',
      options: [
        { id: 'plan-starter', label: 'Starter (5 usuarios)', value: 'Starter', order_index: 0 },
        { id: 'plan-pro', label: 'Pro Business (25 usuarios)', value: 'Pro Business', order_index: 1 },
        { id: 'plan-enterprise', label: 'Enterprise Unlimited', value: 'Enterprise Unlimited', order_index: 2 },
      ],
    },
  ],
  variants: [
    {
      id: 'var-starter',
      catalog_item_id: 'item-saas-002',
      title: 'Starter (5 usuarios)',
      sku: 'ERP-STARTER-MO',
      price_modifier: 350000,
      price_type: 'fixed',
      inventory_quantity: 99999,
      track_inventory: false,
      attributes: { Plan: 'Starter' },
      is_active: true,
    },
    {
      id: 'var-pro',
      catalog_item_id: 'item-saas-002',
      title: 'Pro Business (25 usuarios)',
      sku: 'ERP-PRO-MO',
      price_modifier: 850000,
      price_type: 'fixed',
      inventory_quantity: 99999,
      track_inventory: false,
      attributes: { Plan: 'Pro Business' },
      is_active: true,
    },
  ],
  addon_groups: [
    {
      id: 'addon-dedicated-support',
      name: 'Soporte y SLA 24/7',
      selection_type: 'single',
      is_required: false,
      options: [
        { id: 'opt-std-sup', name: 'Soporte Estándar por Ticket', price_delta: 0, is_default: true },
        { id: 'opt-sla-vip', name: 'Ingeniero Dedicado + WhatsApp VIP 24/7', price_delta: 200000, is_default: false },
      ],
    },
  ],
  badges: ['Descuento', 'Destacado'],
  specifications: {
    features: ['Facturación Electrónica DIAN Ilimitada', 'API REST & Webhooks', 'Almacenamiento Ilimitado S3'],
    deliverables: ['Acceso instantáneo a la nube', 'Capacitación Onboarding 4 horas'],
    warranty: 'SLA de 99.9% uptime con respaldo financiero contractual.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-05T08:00:00Z',
};

// 3. Digital Marketing Agency Retainer (Tier 2-4)
export const mockAgencyService: UniversalCatalogItem = {
  id: 'item-agency-003',
  organization_id: TENANT_A_ID,
  name: 'Growth Marketing & Paid Ads Accelerator',
  description: 'Estrategia completa de adquisición en Meta Ads, Google Ads y TikTok con optimización de ROAS diaria.',
  category_id: 'cat-agency-services',
  category: 'Servicios de Agencia',
  base_price: 2500000,
  type: 'recurring',
  classification: 'service',
  frequency: 'monthly',
  image_url: 'https://cdn.pixy.app/demo/marketing-cover.webp',
  gallery_images: [
    { id: 'mkt-1', url: 'https://cdn.pixy.app/demo/marketing-cover.webp', is_cover: true, order_index: 0 },
  ],
  sku: 'SRV-GROWTH-MKT',
  inventory_quantity: 5,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 2,
  has_variants: false,
  variant_attributes: [],
  variants: [],
  addon_groups: [
    {
      id: 'addon-ugc-creatives',
      name: 'Paquetes de Creativos UGC',
      selection_type: 'multiple',
      is_required: false,
      min_selections: 0,
      max_selections: 3,
      options: [
        { id: 'ugc-4videos', name: '4 Videos UGC con Creadores Profesionales', price_delta: 800000, is_default: false },
        { id: 'ugc-8videos', name: '8 Videos UGC + Fotos de Producto', price_delta: 1400000, is_default: false },
      ],
    },
  ],
  badges: ['Pocas Unidades', 'Destacado'],
  specifications: {
    deliverables: ['Dashboard en tiempo real con Looker Studio', 'Llamada semanal de estrategia', 'Copywriting publicitario ilimitado'],
    warranty: 'Garantía de satisfacción de 30 días o devolución de honorarios de gestión.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-10T10:00:00Z',
};

// 4. Gourmet Restaurant & Catering (Tier 2-4)
export const mockGourmetDish: UniversalCatalogItem = {
  id: 'item-resto-004',
  organization_id: TENANT_A_ID,
  name: 'Corte Ribeye Dry Aged 45 Días al Grill',
  description: '400g de corte premium madurado en seco con mantequilla de trufas negras y papas al romero.',
  category_id: 'cat-resto-carnes',
  category: 'Cortes & Parrilla',
  base_price: 95000,
  compare_at_price: 110000,
  type: 'product',
  classification: 'physical',
  image_url: 'https://cdn.pixy.app/demo/ribeye.webp',
  gallery_images: [
    { id: 'dish-1', url: 'https://cdn.pixy.app/demo/ribeye.webp', is_cover: true, order_index: 0 },
    { id: 'dish-2', url: 'https://cdn.pixy.app/demo/ribeye-cut.webp', is_cover: false, order_index: 1 },
  ],
  sku: 'REST-RIBEYE-45D',
  inventory_quantity: 18,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 5,
  has_variants: true,
  variant_attributes: [
    {
      id: 'attr-meat-doneness',
      organization_id: TENANT_A_ID,
      name: 'Término de la Carne',
      slug: 'termino',
      swatch_type: 'select',
      options: [
        { id: 'term-medium-rare', label: 'Término Medio (Recomendado)', value: 'Medio', order_index: 0 },
        { id: 'term-medium-well', label: 'Tres Cuartos', value: 'Tres Cuartos', order_index: 1 },
        { id: 'term-well-done', label: 'Bien Cocido', value: 'Bien Cocido', order_index: 2 },
      ],
    },
  ],
  variants: [
    {
      id: 'var-term-med',
      catalog_item_id: 'item-resto-004',
      title: 'Término Medio',
      price_modifier: 0,
      price_type: 'offset',
      inventory_quantity: 10,
      track_inventory: true,
      attributes: { 'Término de la Carne': 'Medio' },
      is_active: true,
    },
    {
      id: 'var-term-well',
      catalog_item_id: 'item-resto-004',
      title: 'Bien Cocido',
      price_modifier: 0,
      price_type: 'offset',
      inventory_quantity: 8,
      track_inventory: true,
      attributes: { 'Término de la Carne': 'Bien Cocido' },
      is_active: true,
    },
  ],
  addon_groups: [
    {
      id: 'addon-grp-sides',
      name: 'Guarniciones Extra',
      selection_type: 'multiple',
      is_required: false,
      min_selections: 0,
      max_selections: 2,
      options: [
        { id: 'side-asparagus', name: 'Espárragos salteados a la parrilla', price_delta: 16000, is_default: false },
        { id: 'side-truffle-fries', name: 'Papas trufadas con queso parmesano reggiano', price_delta: 22000, is_default: false },
      ],
    },
  ],
  badges: ['Destacado', 'Novedad'],
  specifications: {
    features: ['Carne Angus Certificada', 'Maduración controlada 45 días', 'Libre de antibióticos'],
    warranty: 'Garantía del punto exacto de cocción según su elección.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-12T14:00:00Z',
};

// Store Customizer Theme Mock
export const mockCustomizerTheme: StoreCustomizerTheme = {
  primary_color: '#4F46E5',
  font_family: 'Inter',
  hero_banner_url: 'https://cdn.pixy.app/demo/hero-banner.webp',
  hero_title: 'Catálogo Oficial de Colecciones Exclusivas',
  hero_subtitle: 'Descubre nuestros productos premium y servicios profesionales con entrega express.',
  faq_items: [
    { question: '¿Cuáles son los métodos de pago aceptados?', answer: 'Aceptamos Tarjetas de Crédito/Débito, PSE, Nequi, Bancolombia QR y transferencias vía Wompi.' },
    { question: '¿Cómo funciona la garantía de satisfacción?', answer: 'Ofrecemos 30 días de garantía total en todos nuestros productos y servicios.' },
  ],
  testimonials: [
    { author: 'Camila Restrepo', role: 'Gerente Comercial', quote: 'La calidad del servicio y la rapidez de entrega superaron todas nuestras expectativas.', avatar_url: 'https://cdn.pixy.app/avatars/camila.webp' },
  ],
  social_links: {
    instagram: 'https://instagram.com/pixy.co',
    whatsapp: 'https://wa.me/573001234567',
    website: 'https://pixy.app',
  },
  business_hours: [
    { day: 'Lunes a Viernes', open: '08:00', close: '18:00', is_closed: false },
    { day: 'Sábados', open: '09:00', close: '14:00', is_closed: false },
    { day: 'Domingos y Festivos', open: '00:00', close: '00:00', is_closed: true },
  ],
};
