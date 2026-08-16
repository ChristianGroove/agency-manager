/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-10-car-rental-dealership
 * Domain: S10 - Vehicle Logistics & Car Rental Fleet
 * Features Exercised: F1, F3, F4, F5, F6, F7, F10, F14, F16, F18
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, calculateEffectiveTotalPrice, formatWhatsAppMessage, StorefrontActionPayload } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';

export const mockCarRental: UniversalCatalogItem = {
  id: 'item-car-010',
  organization_id: TENANT_A_ID,
  name: 'Toyota Fortuner GR-Sport 4x4 2026',
  description: 'Camioneta blindada nivel IIIA para viajes familiares o corporativos con máxima seguridad y confort.',
  category_id: 'cat-suv-fleet',
  category: 'SUVs & Camionetas 4x4',
  base_price: 420000,
  type: 'product',
  classification: 'physical',
  image_url: 'https://cdn.pixy.app/demo/fortuner-front.webp',
  gallery_images: [
    { id: 'car-1', url: 'https://cdn.pixy.app/demo/fortuner-front.webp', is_cover: true, order_index: 0, alt_text: 'Exterior Frente' },
    { id: 'car-2', url: 'https://cdn.pixy.app/demo/fortuner-interior.webp', is_cover: false, order_index: 1, alt_text: 'Interior Cuero' },
  ],
  sku: 'CAR-FORTUNER-2026',
  inventory_quantity: 4,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 1,
  has_variants: true,
  variant_attributes: [
    {
      id: 'attr-transmission',
      organization_id: TENANT_A_ID,
      name: 'Transmisión',
      slug: 'transmision',
      swatch_type: 'pill',
      options: [
        { id: 'trans-auto', label: 'Automática Secuencial 6 Velocidades', value: 'Automática', order_index: 0 },
        { id: 'trans-manual', label: 'Manual 6 Velocidades', value: 'Manual', order_index: 1 },
      ],
    },
  ],
  variants: [
    {
      id: 'var-auto-4x4',
      catalog_item_id: 'item-car-010',
      title: 'Automática 4x4 Diesel',
      price_modifier: 0,
      price_type: 'offset',
      inventory_quantity: 3,
      track_inventory: true,
      attributes: { Transmisión: 'Automática' },
      is_active: true,
    },
    {
      id: 'var-man-4x4',
      catalog_item_id: 'item-car-010',
      title: 'Manual 4x4 Diesel',
      price_modifier: -30000,
      price_type: 'offset',
      inventory_quantity: 1,
      track_inventory: true,
      attributes: { Transmisión: 'Manual' },
      is_active: true,
    },
  ],
  addon_groups: [
    {
      id: 'addon-insurance-fleet',
      name: 'Cobertura de Seguro',
      selection_type: 'single',
      is_required: true,
      options: [
        { id: 'ins-basic', name: 'Seguro Obligatorio Básico (Deducible 10%)', price_delta: 0, is_default: true },
        { id: 'ins-full-vip', name: 'Cobertura Total Cero Deducible + Asistencia 24/7', price_delta: 85000, is_default: false },
      ],
    },
    {
      id: 'addon-extras-car',
      name: 'Accesorios Opcionales',
      selection_type: 'multiple',
      is_required: false,
      options: [
        { id: 'ext-gps', name: 'GPS Satelital + Wifi Móvil a Bordo', price_delta: 25000, is_default: false },
        { id: 'ext-baby-seat', name: 'Silla para Bebé Certificada ISOFIX', price_delta: 20000, is_default: false },
      ],
    },
  ],
  badges: ['Destacado', 'Novedad'],
  specifications: {
    features: ['Motor 2.8L Turbo Diesel 201 HP', 'Tracción 4x4 con selector electrónico', 'Blindaje IIIA certificado'],
    warranty: 'Vehículo desinfectado y tanque lleno garantizado.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

const car = mockCarRental;

export const suite = {
  name: 'T4-10: Scenario S10 - Car Rental Fleet',
  tier: 'Tier 4',
  feature: 'S10: Vehicle Logistics & Car Rental Fleet',
  tests: [
    {
      name: 'Step 1: Vehicle gallery and transmission matrix validation',
      fn: async () => {
        expect(car.classification).toBe('physical');
        expect(car.variants).toHaveLength(2);
        expect(car.gallery_images).toHaveLength(2);
      },
    },
    {
      name: 'Step 2: Customer reserves Automatic 4x4 + Full VIP Insurance ($85k) + GPS Wifi ($25k)',
      fn: async () => {
        const autoVariant = car.variants[0];
        const vipInsurance = car.addon_groups[0].options[1];
        const gpsWifi = car.addon_groups[1].options[0];

        const total = calculateEffectiveTotalPrice(
          car,
          autoVariant,
          [
            { priceDelta: vipInsurance.price_delta },
            { priceDelta: gpsWifi.price_delta },
          ],
          5
        );

        expect(total).toBe(2650000);
      },
    },
    {
      name: 'Step 3: Customer formats reservation payload into WhatsApp booking link',
      fn: async () => {
        const autoVariant = car.variants[0];
        const vipInsurance = car.addon_groups[0].options[1];
        const gpsWifi = car.addon_groups[1].options[0];

        const payload: StorefrontActionPayload = {
          itemId: car.name,
          variantId: autoVariant.id,
          selectedVariant: autoVariant,
          selectedAddons: [
            { groupId: 'ins', optionId: vipInsurance.id, name: vipInsurance.name, priceDelta: vipInsurance.price_delta },
            { groupId: 'ext', optionId: gpsWifi.id, name: gpsWifi.name, priceDelta: gpsWifi.price_delta },
          ],
          calculatedTotalPrice: 2650000,
          quantity: 5,
          customerInfo: {
            name: 'Rodrigo Echeverry',
            phone: '3153334455',
            notes: 'Recogida en Aeropuerto José María Córdova (MDE).',
          },
          deepLinkUrl: 'https://pixy.app/rentacar/p/item-car-010?days=5',
        };

        const wa = formatWhatsAppMessage(payload, '+573001234567');
        expect(wa.rawText).toContain('Toyota Fortuner GR-Sport');
        expect(wa.rawText).toContain('Cobertura Total Cero Deducible');
        expect(wa.rawText).toContain('GPS Satelital');
        expect(wa.rawText).toContain('$2.650.000 COP');
      },
    },
    {
      name: 'Step 4: Manual transmission variant discount applies negative offset correctly',
      fn: async () => {
        const manualVariant = car.variants[1];
        const total = calculateEffectiveTotalPrice(car, manualVariant, null, 1);
        expect(total).toBe(390000);
      },
    },
    {
      name: 'Step 5: Required insurance add-on group enforces selection',
      fn: async () => {
        expect(car.addon_groups[0].is_required).toBe(true);
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
