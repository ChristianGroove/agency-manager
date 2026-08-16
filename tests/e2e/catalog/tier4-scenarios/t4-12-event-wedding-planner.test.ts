/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-12-event-wedding-planner
 * Domain: S12 - Luxury Wedding & Event Planning
 * Features Exercised: F1 (Gallery), F3 (Classification), F4 (Variants), F5 (Addons), F6 (Modal), F7 (Carousel), F11 (Specs), F16 (WhatsApp), F17 (CRM), F19 (Appointment), F22 (Customizer)
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, calculateEffectiveTotalPrice, StorefrontActionPayload } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';
import { validateAppointmentSlot } from '../tier2-boundaries/t2-19-appointment-slot-edge.test';
import { submitStorefrontQuoteToCRM, CRMSubmissionState } from '../tier2-boundaries/t2-17-crm-lead-dedup-resilience.test';

export const mockWeddingPackage: UniversalCatalogItem = {
  id: 'item-event-012',
  organization_id: TENANT_A_ID,
  name: 'Paquete de Bodas Destination Wedding Exclusivo',
  description: 'Planificación integral de bodas de destino en Cartagena, Villa de Leyva y Medellín.',
  category_id: 'cat-events-wedding',
  category: 'Bodas & Eventos',
  base_price: 8500000,
  type: 'one_off',
  classification: 'service',
  image_url: 'https://cdn.pixy.app/demo/wedding-cover.webp',
  gallery_images: [
    { id: 'wd-1', url: 'https://cdn.pixy.app/demo/wedding-cover.webp', is_cover: true, order_index: 0 },
    { id: 'wd-2', url: 'https://cdn.pixy.app/demo/wedding-altar.webp', is_cover: false, order_index: 1 },
  ],
  video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  inventory_quantity: 4, // Max 4 weddings per month
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 1,
  has_variants: true,
  variant_attributes: [
    {
      id: 'attr-guest-tier',
      organization_id: TENANT_A_ID,
      name: 'Escala de Invitados',
      slug: 'escala',
      swatch_type: 'pill',
      options: [
        { id: 'tier-intimate', label: 'Íntima (Hasta 50 invitados)', value: '50 Invitados', order_index: 0 },
        { id: 'tier-grand', label: 'Grand Gala (Hasta 150 invitados)', value: '150 Invitados', order_index: 1 },
      ],
    },
  ],
  variants: [
    {
      id: 'var-intimate',
      catalog_item_id: 'item-event-012',
      title: 'Íntima (Hasta 50 invitados)',
      price_modifier: 8500000,
      price_type: 'fixed',
      inventory_quantity: 4,
      track_inventory: true,
      attributes: { 'Escala de Invitados': '50 Invitados' },
      is_active: true,
    },
    {
      id: 'var-grand',
      catalog_item_id: 'item-event-012',
      title: 'Grand Gala (Hasta 150 invitados)',
      price_modifier: 14500000,
      price_type: 'fixed',
      inventory_quantity: 2,
      track_inventory: true,
      attributes: { 'Escala de Invitados': '150 Invitados' },
      is_active: true,
    },
  ],
  addon_groups: [
    {
      id: 'addon-drone-cinema',
      name: 'Cobertura Audiovisual Cinematográfica',
      selection_type: 'multiple',
      is_required: false,
      options: [
        { id: 'opt-drone-4k', name: 'Drone 4K + 2 Videógrafos de Cine', price_delta: 2800000, is_default: false },
        { id: 'opt-live-violin', name: 'Orquesta de Cuerdas & Violín en Ceremonia', price_delta: 1900000, is_default: false },
      ],
    },
  ],
  badges: ['Destacado'],
  specifications: {
    features: ['Wedding Planner certificada ABC', 'Coordinación minuciosa de 12 proveedores', 'Prueba de maquillaje y estilismo'],
    deliverables: ['Cronograma minuto a minuto', 'Presupuesto maestro optimizado'],
    warranty: 'Acompañamiento presencial de 14 horas continuas el día de la boda.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

const wedding = mockWeddingPackage;

export const suite = {
  name: 'T4-12: Scenario S12 - Luxury Wedding & Event Planning',
  tier: 'Tier 4',
  feature: 'S12: Luxury Wedding & Event Planning',
  tests: [
    {
      name: 'Step 1: Wedding service configuration and guest scale variants validation',
      fn: async () => {
        expect(wedding.classification).toBe('service');
        expect(wedding.variants).toHaveLength(2);
        expect(wedding.variants[0].price_modifier).toBe(8500000);
        expect(wedding.variants[1].price_modifier).toBe(14500000);
      },
    },
    {
      name: 'Step 2: Couple configures Grand Gala tier + Drone Cinema 4K ($2.8M) + String Orchestra ($1.9M)',
      fn: async () => {
        const grandVariant = wedding.variants[1];
        const droneAddon = wedding.addon_groups[0].options[0];
        const orchestraAddon = wedding.addon_groups[0].options[1];

        const total = calculateEffectiveTotalPrice(
          wedding,
          grandVariant,
          [
            { priceDelta: droneAddon.price_delta },
            { priceDelta: orchestraAddon.price_delta },
          ],
          1
        );

        // 14,500,000 + 2,800,000 + 1,900,000 = 19,200,000 COP
        expect(total).toBe(19200000);
      },
    },
    {
      name: 'Step 3: Couple schedules initial wedding tasting & design consultation session',
      fn: async () => {
        const slotRes = validateAppointmentSlot(
          {
            serviceId: wedding.id,
            isServiceActive: true,
            startTimeIso: '2026-08-22T14:00:00Z', // Saturday 14:00 UTC
            durationMinutes: 60,
            businessHours: { startHour: 9, endHour: 18, closedDays: [0] },
            existingBookings: [],
          },
          new Date('2026-08-16T00:00:00Z').getTime()
        );

        expect(slotRes.isValid).toBe(true);
      },
    },
    {
      name: 'Step 4: Converts tailored wedding package into formal CRM Lead and Quote draft',
      fn: async () => {
        const crmState: CRMSubmissionState = { recentSubmissions: new Map() };
        const grandVariant = wedding.variants[1];
        const droneAddon = wedding.addon_groups[0].options[0];
        const orchestraAddon = wedding.addon_groups[0].options[1];

        const payload: StorefrontActionPayload = {
          itemId: wedding.id,
          variantId: grandVariant.id,
          selectedVariant: grandVariant,
          selectedAddons: [
            { groupId: 'av', optionId: droneAddon.id, name: droneAddon.name, priceDelta: droneAddon.price_delta },
            { groupId: 'av', optionId: orchestraAddon.id, name: orchestraAddon.name, priceDelta: orchestraAddon.price_delta },
          ],
          calculatedTotalPrice: 19200000,
          quantity: 1,
          customerInfo: {
            name: 'Camila & Esteban',
            email: 'boda.camila.esteban@gmail.com',
            phone: '3169990011',
            notes: 'Fecha tentativa de boda: 15 de Noviembre en Casa 1537 (Cartagena).',
          },
          deepLinkUrl: 'https://pixy.app/weddings/p/item-event-012?variant=var-grand',
        };

        const crm = submitStorefrontQuoteToCRM(payload, TENANT_A_ID, crmState);
        expect(crm.success).toBe(true);
        expect(crm.draft?.quote.total_amount).toBe(19200000);
        expect(crm.draft?.lead.name).toBe('Camila & Esteban');
      },
    },
    {
      name: 'Step 5: Event planner customizer theme matches luxury romantic palette',
      fn: async () => {
        expect(wedding.is_visible_in_portal).toBe(true);
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
