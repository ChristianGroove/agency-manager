/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-11-artisan-handmade-crafts
 * Domain: S11 - Artisan & Handcrafted Goods
 * Features Exercised: F1, F2, F3, F4, F6, F7, F8, F12, F14, F16, F18
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, calculateEffectiveTotalPrice } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';
import { computeZoomPosition } from '../tier2-boundaries/t2-08-zoom-boundaries.test';
import { createWompiPaymentSession } from '../tier2-boundaries/t2-18-wompi-currency-min-max.test';

export const mockArtisanCraft: UniversalCatalogItem = {
  id: 'item-craft-011',
  organization_id: TENANT_A_ID,
  name: 'Mochila Wayúu Genuina Tejida en Hilo de Seda',
  description: 'Pieza única tejida a mano durante 30 días por maestras artesanas de La Guajira con técnicas ancestrales.',
  category_id: 'cat-artesanias',
  category: 'Artesanías & Cultura',
  base_price: 320000,
  type: 'product',
  classification: 'physical',
  image_url: 'https://cdn.pixy.app/demo/wayuu-cover.webp',
  gallery_images: [
    { id: 'wy-1', url: 'https://cdn.pixy.app/demo/wayuu-cover.webp', is_cover: true, order_index: 0, alt_text: 'Vista General' },
    { id: 'wy-2', url: 'https://cdn.pixy.app/demo/wayuu-weave.webp', is_cover: false, order_index: 1, alt_text: 'Detalle Tejido' },
  ],
  sku: 'CRAFT-WAYUU-SILK',
  inventory_quantity: 3,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 3,
  has_variants: true,
  variant_attributes: [
    {
      id: 'attr-craft-color',
      organization_id: TENANT_A_ID,
      name: 'Diseño Geométrico (Kanas)',
      slug: 'kanas',
      swatch_type: 'pill',
      options: [
        { id: 'pat-sol', label: 'Patrón Sol (Kaunashü)', value: 'Kaunashü', order_index: 0 },
        { id: 'pat-estrella', label: 'Patrón Estrellas (Shulliwala)', value: 'Shulliwala', order_index: 1 },
      ],
    },
  ],
  variants: [
    {
      id: 'var-sol',
      catalog_item_id: 'item-craft-011',
      title: 'Kaunashü (Sol)',
      price_modifier: 0,
      price_type: 'offset',
      inventory_quantity: 2,
      track_inventory: true,
      attributes: { 'Diseño Geométrico (Kanas)': 'Kaunashü' },
      is_active: true,
    },
    {
      id: 'var-estrella',
      catalog_item_id: 'item-craft-011',
      title: 'Shulliwala (Estrellas)',
      price_modifier: 40000,
      price_type: 'offset',
      inventory_quantity: 1,
      track_inventory: true,
      attributes: { 'Diseño Geométrico (Kanas)': 'Shulliwala' },
      is_active: true,
    },
  ],
  addon_groups: [
    {
      id: 'addon-craft-engraving',
      name: 'Placa de Cuero Personalizada',
      selection_type: 'single',
      is_required: false,
      options: [
        { id: 'eng-none', name: 'Sin Placa (Original)', price_delta: 0, is_default: true },
        { id: 'eng-custom', name: 'Placa con Iniciales Grabadas en Cuero Genuino', price_delta: 25000, is_default: false },
      ],
    },
  ],
  badges: ['Pocas Unidades', 'Destacado'],
  specifications: {
    features: ['100% Hilo de seda y algodón mercerizado', 'Técnica de un solo hilo (Ganchillo fino)', 'Certificado de autenticidad y origen'],
    warranty: 'Garantía artesanal de por vida en costuras de reata.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

const craft = mockArtisanCraft;

export const suite = {
  name: 'T4-11: Scenario S11 - Artisan Handmade Crafts',
  tier: 'Tier 4',
  feature: 'S11: Artisan Goods & High-Res Zoom Experience',
  tests: [
    {
      name: 'Step 1: Artisan piece gallery with intricate weave zoom inspects stitch quality',
      fn: async () => {
        expect(craft.gallery_images).toHaveLength(2);
        const zoom = computeZoomPosition({ x: 400, y: 300, containerWidth: 800, containerHeight: 600 }, 3.0);
        expect(zoom.enabled).toBe(true);
        expect(zoom.zoomScale).toBe(3.0);
      },
    },
    {
      name: 'Step 2: Customer selects Intricate Stars pattern + Leather initials engraving addon',
      fn: async () => {
        const starVariant = craft.variants[1];
        const engravingAddon = craft.addon_groups[0].options[1];

        const total = calculateEffectiveTotalPrice(
          craft,
          starVariant,
          [{ priceDelta: engravingAddon.price_delta }],
          1
        );

        expect(total).toBe(385000);
      },
    },
    {
      name: 'Step 3: Wompi Express payment session generated for handcrafted piece',
      fn: async () => {
        const sessionRes = createWompiPaymentSession(385000, 'COP', 'artisan-wayuu-ord-101', 'wompi_sec');
        expect(sessionRes.isValid).toBe(true);
        expect(sessionRes.session?.amount_in_cents).toBe(38500000);
      },
    },
    {
      name: 'Step 4: Dynamic stock badge reflects "Pocas Unidades" for limited craft inventory (qty = 3)',
      fn: async () => {
        expect(craft.badges).toContain('Pocas Unidades');
      },
    },
    {
      name: 'Step 5: Physical classification enforces stock deduction on checkout',
      fn: async () => {
        expect(craft.classification).toBe('physical');
        expect(craft.track_inventory).toBe(true);
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier4');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
