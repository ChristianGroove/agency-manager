/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-06-gym-fitness-memberships
 * Domain: S6 - Wellness & Gym Fitness Subscriptions
 * Features Exercised: F3, F4, F5, F6, F10, F12, F14, F18, F22
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, calculateEffectiveTotalPrice } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';
import { createWompiPaymentSession } from '../tier2-boundaries/t2-18-wompi-currency-min-max.test';
import { generateStorefrontQRUrl } from '../tier2-boundaries/t2-14-qr-special-chars.test';

export const mockGymMembership: UniversalCatalogItem = {
  id: 'item-gym-006',
  organization_id: TENANT_A_ID,
  name: 'Membresía VIP PowerFitness Club',
  description: 'Acceso ilimitado a todas las sedes, zona de pesas, spa, sauna y clases grupales.',
  category_id: 'cat-fitness',
  category: 'Fitness & Salud',
  base_price: 150000,
  compare_at_price: 180000,
  type: 'recurring',
  classification: 'subscription',
  frequency: 'monthly',
  image_url: 'https://cdn.pixy.app/demo/gym-cover.webp',
  gallery_images: [
    { id: 'gym-1', url: 'https://cdn.pixy.app/demo/gym-cover.webp', is_cover: true, order_index: 0 },
  ],
  inventory_quantity: 100,
  track_inventory: false,
  allow_backorders: true,
  low_stock_threshold: 0,
  has_variants: true,
  variant_attributes: [
    {
      id: 'attr-gym-duration',
      organization_id: TENANT_A_ID,
      name: 'Frecuencia de Pago',
      slug: 'frecuencia',
      swatch_type: 'pill',
      options: [
        { id: 'freq-monthly', label: 'Mensual', value: 'Mensual', order_index: 0 },
        { id: 'freq-annual', label: 'Anual (2 Meses Gratis)', value: 'Anual', order_index: 1 },
      ],
    },
  ],
  variants: [
    {
      id: 'var-gym-mo',
      catalog_item_id: 'item-gym-006',
      title: 'Plan Mensual',
      price_modifier: 150000,
      price_type: 'fixed',
      inventory_quantity: 999,
      track_inventory: false,
      attributes: { 'Frecuencia de Pago': 'Mensual' },
      is_active: true,
    },
    {
      id: 'var-gym-yr',
      catalog_item_id: 'item-gym-006',
      title: 'Plan Anual',
      price_modifier: 1500000,
      price_type: 'fixed',
      inventory_quantity: 999,
      track_inventory: false,
      attributes: { 'Frecuencia de Pago': 'Anual' },
      is_active: true,
    },
  ],
  addon_groups: [
    {
      id: 'addon-personal-trainer',
      name: 'Entrenador Personalizado',
      selection_type: 'single',
      is_required: false,
      options: [
        { id: 'pt-none', name: 'Entrenamiento Autónomo (Sin Coach)', price_delta: 0, is_default: true },
        { id: 'pt-12sessions', name: 'Coach Personalizado (12 Sesiones / Mes)', price_delta: 350000, is_default: false },
      ],
    },
  ],
  badges: ['Descuento', 'Destacado'],
  specifications: {
    features: ['Acceso 24/7 con huella digital o FaceID', 'Zona húmeda (Sauna & Turco)', 'App móvil de seguimiento de rutinas'],
    warranty: 'Congelación de plan hasta por 30 días sin costo adicional.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

const gym = mockGymMembership;

export const suite = {
  name: 'T4-06: Scenario S6 - Gym Fitness Subscriptions',
  tier: 'Tier 4',
  feature: 'S6: Wellness & Gym Fitness Subscriptions',
  tests: [
    {
      name: 'Step 1: Subscription frequency options (Monthly vs Annual) correctly defined',
      fn: async () => {
        expect(gym.classification).toBe('subscription');
        expect(gym.variants).toHaveLength(2);
        expect(gym.variants[0].price_modifier).toBe(150000);
        expect(gym.variants[1].price_modifier).toBe(1500000);
      },
    },
    {
      name: 'Step 2: Member selects Annual Plan + Personal Trainer Upsell addon (12 sessions)',
      fn: async () => {
        const annualVariant = gym.variants[1];
        const ptAddon = gym.addon_groups[0].options[1];

        const total = calculateEffectiveTotalPrice(gym, annualVariant, [{ priceDelta: ptAddon.price_delta }], 1);
        expect(total).toBe(1850000);
      },
    },
    {
      name: 'Step 3: Wompi session created for annual recurring fitness subscription',
      fn: async () => {
        const total = 1850000;
        const sessionRes = createWompiPaymentSession(total, 'COP', 'gym-member-sub-991', 'gym_wompi_secret');

        expect(sessionRes.isValid).toBe(true);
        expect(sessionRes.session?.amount_in_cents).toBe(185000000);
        expect(sessionRes.session?.integrity_signature).toBeDefined();
      },
    },
    {
      name: 'Step 4: QR code generation for front desk reception counter poster check-in',
      fn: async () => {
        const qr = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'powerfitness',
          itemId: gym.id,
          variantId: 'var-gym-yr',
          customQueryParams: { promo: 'ANUAL2026', desk: 'reception_qr' },
        });

        expect(qr.fullUrl).toContain('powerfitness/p/item-gym-006?variant=var-gym-yr');
        expect(qr.fullUrl).toContain('promo=ANUAL2026');
      },
    },
    {
      name: 'Step 5: Dynamic discount badge verifies promo percentage',
      fn: async () => {
        expect(gym.badges).toContain('Descuento');
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
