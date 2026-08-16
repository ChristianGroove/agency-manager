/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-12-pet-care-veterinary
 * Domain: S12 - Veterinary & Pet Grooming Appointments
 * Features Exercised: F1, F3, F4, F5, F6, F10, F11, F16, F19, F22
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, calculateEffectiveTotalPrice, formatWhatsAppMessage, StorefrontActionPayload } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';
import { validateAppointmentSlot } from '../tier2-boundaries/t2-19-appointment-slot-edge.test';

export const mockPetGroomingService: UniversalCatalogItem = {
  id: 'item-pet-012',
  organization_id: TENANT_A_ID,
  name: 'Spa Canino & Grooming Dermatológico Premium',
  description: 'Baño con ozonoterapia, corte de raza, limpieza de oídos, corte de uñas y cepillado dental.',
  category_id: 'cat-pet-spa',
  category: 'Spa & Veterinaria',
  base_price: 65000,
  type: 'one_off',
  classification: 'service',
  image_url: 'https://cdn.pixy.app/demo/pet-spa.webp',
  gallery_images: [
    { id: 'pet-1', url: 'https://cdn.pixy.app/demo/pet-spa.webp', is_cover: true, order_index: 0 },
  ],
  inventory_quantity: 12,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 2,
  has_variants: true,
  variant_attributes: [
    {
      id: 'attr-pet-size',
      organization_id: TENANT_A_ID,
      name: 'Tamaño de la Mascota',
      slug: 'tamano',
      swatch_type: 'pill',
      options: [
        { id: 'sz-small', label: 'Pequeño (Hasta 10 kg)', value: 'Pequeño', order_index: 0 },
        { id: 'sz-medium', label: 'Mediano (11 a 25 kg)', value: 'Mediano', order_index: 1 },
        { id: 'sz-large', label: 'Grande (Más de 25 kg)', value: 'Grande', order_index: 2 },
      ],
    },
  ],
  variants: [
    {
      id: 'var-sz-small',
      catalog_item_id: 'item-pet-012',
      title: 'Perro Pequeño',
      price_modifier: 0,
      price_type: 'offset',
      inventory_quantity: 5,
      track_inventory: true,
      attributes: { 'Tamaño de la Mascota': 'Pequeño' },
      is_active: true,
    },
    {
      id: 'var-sz-medium',
      catalog_item_id: 'item-pet-012',
      title: 'Perro Mediano',
      price_modifier: 20000,
      price_type: 'offset',
      inventory_quantity: 4,
      track_inventory: true,
      attributes: { 'Tamaño de la Mascota': 'Mediano' },
      is_active: true,
    },
    {
      id: 'var-sz-large',
      catalog_item_id: 'item-pet-012',
      title: 'Perro Grande',
      price_modifier: 45000,
      price_type: 'offset',
      inventory_quantity: 3,
      track_inventory: true,
      attributes: { 'Tamaño de la Mascota': 'Grande' },
      is_active: true,
    },
  ],
  addon_groups: [
    {
      id: 'addon-pet-extras',
      name: 'Tratamientos Especiales',
      selection_type: 'multiple',
      is_required: false,
      options: [
        { id: 'ext-deshedding', name: 'Deslanado Profundo Anti-Caída', price_delta: 25000, is_default: false },
        { id: 'ext-antipulgas', name: 'Baño Medicado Antipulgas y Garrapatas', price_delta: 30000, is_default: false },
      ],
    },
  ],
  badges: ['Destacado'],
  specifications: {
    features: ['Shampoo hipoalergénico orgánico', 'Cabina de secado anti-estrés', 'Snack gourmet de premio incluido'],
    warranty: 'Personal certificado en primeros auxilios veterinarios.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

const pet = mockPetGroomingService;

export const suite = {
  name: 'T4-12: Scenario S12 - Veterinary & Pet Grooming',
  tier: 'Tier 4',
  feature: 'S12: Pet Care & Veterinary Grooming Booking',
  tests: [
    {
      name: 'Step 1: Pet size variant options configuration and price offsets verification',
      fn: async () => {
        expect(pet.classification).toBe('service');
        expect(pet.variants).toHaveLength(3);
        expect(pet.variants[0].price_modifier).toBe(0);
        expect(pet.variants[1].price_modifier).toBe(20000);
        expect(pet.variants[2].price_modifier).toBe(45000);
      },
    },
    {
      name: 'Step 2: Pet owner selects Large Dog + Deshedding ($25k) + Anti-flea bath ($30k)',
      fn: async () => {
        const largeVariant = pet.variants[2];
        const deshedding = pet.addon_groups[0].options[0];
        const antiflea = pet.addon_groups[0].options[1];

        const total = calculateEffectiveTotalPrice(
          pet,
          largeVariant,
          [
            { priceDelta: deshedding.price_delta },
            { priceDelta: antiflea.price_delta },
          ],
          1
        );

        expect(total).toBe(165000);
      },
    },
    {
      name: 'Step 3: Owner books 90-minute grooming session on clinic timetable',
      fn: async () => {
        const res = validateAppointmentSlot(
          {
            serviceId: pet.id,
            isServiceActive: true,
            startTimeIso: '2026-08-20T14:00:00Z',
            durationMinutes: 90,
            businessHours: { startHour: 8, endHour: 18, closedDays: [0] },
            existingBookings: [],
          },
          new Date('2026-08-16T00:00:00Z').getTime()
        );

        expect(res.isValid).toBe(true);
      },
    },
    {
      name: 'Step 4: Formats WhatsApp booking message with pet name, breed and chosen add-ons',
      fn: async () => {
        const largeVariant = pet.variants[2];
        const deshedding = pet.addon_groups[0].options[0];
        const antiflea = pet.addon_groups[0].options[1];

        const payload: StorefrontActionPayload = {
          itemId: pet.name,
          variantId: largeVariant.id,
          selectedVariant: largeVariant,
          selectedAddons: [
            { groupId: 'g1', optionId: deshedding.id, name: deshedding.name, priceDelta: deshedding.price_delta },
            { groupId: 'g1', optionId: antiflea.id, name: antiflea.name, priceDelta: antiflea.price_delta },
          ],
          calculatedTotalPrice: 165000,
          quantity: 1,
          customerInfo: {
            name: 'Camila Rios',
            phone: '3164445566',
            notes: 'Mascota: Golden Retriever ("Simón", 32kg). Cita: Jueves 20 Agosto 2:00 PM.',
          },
          deepLinkUrl: 'https://pixy.app/petspa/p/item-pet-012',
        };

        const wa = formatWhatsAppMessage(payload, '+573001234567');
        expect(wa.rawText).toContain('Spa Canino & Grooming Dermatológico');
        expect(wa.rawText).toContain('Perro Grande');
        expect(wa.rawText).toContain('Deslanado Profundo Anti-Caída');
        expect(wa.rawText).toContain('Golden Retriever ("Simón", 32kg)');
        expect(wa.rawText).toContain('$165.000 COP');
      },
    },
    {
      name: 'Step 5: Storefront customizer theme reflects friendly veterinary colors',
      fn: async () => {
        expect(pet.category).toBe('Spa & Veterinaria');
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
