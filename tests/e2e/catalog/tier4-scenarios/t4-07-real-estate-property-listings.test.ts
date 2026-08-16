/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-07-real-estate-property-listings
 * Domain: S7 - Luxury Real Estate & Property Showcase
 * Features Exercised: F1, F3, F6, F7, F8, F9, F11, F14, F15, F16, F17
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, formatWhatsAppMessage, StorefrontActionPayload } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';
import { parseAndSanitizeVideoUrl } from '../tier2-boundaries/t2-09-video-malformed.test';
import { parseSpecificationTabs } from '../tier2-boundaries/t2-11-spec-tabs-empty.test';
import { generateStorefrontQRUrl } from '../tier2-boundaries/t2-14-qr-special-chars.test';

export const mockPenthouseProperty: UniversalCatalogItem = {
  id: 'item-realestate-007',
  organization_id: TENANT_A_ID,
  name: 'Penthouse Dúplex El Poblado con Vista Panorámica',
  description: 'Exclusivo penthouse de 380m² con 4 suites, terraza privada, jacuzzi, cocina italiana y 4 parqueaderos.',
  category_id: 'cat-prop-luxury',
  category: 'Propiedades de Lujo',
  base_price: 2850000000,
  type: 'one_off',
  classification: 'physical',
  image_url: 'https://cdn.pixy.app/demo/penthouse-main.webp',
  gallery_images: [
    { id: 'ph-1', url: 'https://cdn.pixy.app/demo/penthouse-main.webp', is_cover: true, order_index: 0, alt_text: 'Sala Principal' },
    { id: 'ph-2', url: 'https://cdn.pixy.app/demo/penthouse-terrace.webp', is_cover: false, order_index: 1, alt_text: 'Terraza y Jacuzzi' },
    { id: 'ph-3', url: 'https://cdn.pixy.app/demo/penthouse-master.webp', is_cover: false, order_index: 2, alt_text: 'Master Suite' },
    { id: 'ph-4', url: 'https://cdn.pixy.app/demo/penthouse-kitchen.webp', is_cover: false, order_index: 3, alt_text: 'Cocina Italiana' },
  ],
  video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  inventory_quantity: 1,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 1,
  has_variants: false,
  variant_attributes: [],
  variants: [],
  addon_groups: [],
  badges: ['Destacado', 'Pocas Unidades'],
  specifications: {
    features: ['380 m² construidos', '4 Habitaciones en suite con vestier', '5 Baños con acabados en mármol', '4 Parqueaderos cubiertos + 2 cuartos útiles'],
    deliverables: ['Escrituración inmediata', 'Amoblado de diseñador opcional'],
    warranty: 'Construcción con norma sismorresistente NSR-10 y garantía estructural de 10 años.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-05T00:00:00Z',
};

const property = mockPenthouseProperty;

export const suite = {
  name: 'T4-07: Scenario S7 - Luxury Real Estate Listings',
  tier: 'Tier 4',
  feature: 'S7: Property Showcase & Architectural Real Estate',
  tests: [
    {
      name: 'Step 1: Multi-photo architectural gallery features 4 high-resolution viewpoints',
      fn: async () => {
        expect(property.gallery_images).toHaveLength(4);
        expect(property.gallery_images[0].alt_text).toBe('Sala Principal');
        expect(property.base_price).toBe(2850000000);
      },
    },
    {
      name: 'Step 2: Video virtual tour embeds securely into detail modal carousel',
      fn: async () => {
        const video = parseAndSanitizeVideoUrl(property.video_url);
        expect(video.isValid).toBe(true);
        expect(video.provider).toBe('youtube');
        expect(video.embedUrl).toContain('https://www.youtube-nocookie.com/embed/');
      },
    },
    {
      name: 'Step 3: Specification tabs render square meters, rooms, and structural warranties',
      fn: async () => {
        const tabs = parseSpecificationTabs(property.description, property.specifications);
        expect(tabs.length).toBeGreaterThanOrEqual(3);

        const featuresTab = tabs.find((t) => t.id === 'features');
        expect(featuresTab).toBeDefined();
        expect((featuresTab!.content as string[])).toContain('380 m² construidos');
      },
    },
    {
      name: 'Step 4: Printed physical brochure QR code encodes direct property deep link',
      fn: async () => {
        const qr = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'inmobiliaria-elite',
          itemId: property.id,
          customQueryParams: { ref: 'brochure_print_medellin' },
        });

        expect(qr.fullUrl).toContain('inmobiliaria-elite/p/item-realestate-007?ref=brochure_print_medellin');
      },
    },
    {
      name: 'Step 5: Buyer sends direct WhatsApp VIP private tour inquiry to real estate broker',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: property.name,
          calculatedTotalPrice: property.base_price,
          quantity: 1,
          customerInfo: {
            name: 'Alejandro Santamaría',
            phone: '3105557788',
            notes: 'Deseo agendar visita privada este viernes a las 11am.',
          },
          deepLinkUrl: 'https://pixy.app/inmobiliaria-elite/p/item-realestate-007',
        };

        const wa = formatWhatsAppMessage(payload, '+573001234567');
        expect(wa.rawText).toContain('Penthouse Dúplex El Poblado');
        expect(wa.rawText).toContain('$2.850.000.000 COP');
        expect(wa.rawText).toContain('Alejandro Santamaría');
        expect(wa.rawText).toContain('Deseo agendar visita privada');
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
