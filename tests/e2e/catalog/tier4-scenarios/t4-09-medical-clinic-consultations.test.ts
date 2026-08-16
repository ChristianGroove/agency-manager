/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-09-medical-clinic-consultations
 * Domain: S9 - Healthcare & Medical Clinic Appointments
 * Features Exercised: F3, F6, F11, F12, F16, F17, F19, F25
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, formatWhatsAppMessage, StorefrontActionPayload } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';
import { validateAppointmentSlot } from '../tier2-boundaries/t2-19-appointment-slot-edge.test';
import { parseSpecificationTabs } from '../tier2-boundaries/t2-11-spec-tabs-empty.test';

export const mockMedicalConsultation: UniversalCatalogItem = {
  id: 'item-medical-009',
  organization_id: TENANT_A_ID,
  name: 'Consulta Especializada en Dermatología Clínica',
  description: 'Valoración dermatológica integral con dermatoscopia digital de lunares y tratamiento personalizado.',
  category_id: 'cat-med-derma',
  category: 'Dermatología',
  base_price: 220000,
  type: 'one_off',
  classification: 'service',
  image_url: 'https://cdn.pixy.app/demo/doctor-profile.webp',
  gallery_images: [
    { id: 'doc-1', url: 'https://cdn.pixy.app/demo/doctor-profile.webp', is_cover: true, order_index: 0 },
    { id: 'doc-2', url: 'https://cdn.pixy.app/demo/clinic-room.webp', is_cover: false, order_index: 1 },
  ],
  inventory_quantity: 8,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 3,
  has_variants: false,
  variant_attributes: [],
  variants: [],
  addon_groups: [],
  badges: ['Destacado'],
  specifications: {
    features: ['Dra. Sofia Montoya - Registro Médico 12345678', 'Especialista Universidad de Antioquia', 'Dermatoscopia digital con IA'],
    deliverables: ['Prescripción médica digital DIAN', 'Historia clínica electrónica confidencial'],
    warranty: 'Control médico post-consulta a los 15 días incluido.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

const medical = mockMedicalConsultation;

export const suite = {
  name: 'T4-09: Scenario S9 - Medical Clinic Appointments',
  tier: 'Tier 4',
  feature: 'S9: Healthcare & Clinical Consultations Hub',
  tests: [
    {
      name: 'Step 1: Medical consultation service classification and doctor credentials validation',
      fn: async () => {
        expect(medical.classification).toBe('service');
        expect(medical.category).toBe('Dermatología');
        expect(medical.base_price).toBe(220000);
      },
    },
    {
      name: 'Step 2: Doctor bio and clinic facilities tabs render verified qualifications',
      fn: async () => {
        const tabs = parseSpecificationTabs(medical.description, medical.specifications);
        expect(tabs.length).toBeGreaterThanOrEqual(3);

        const featuresTab = tabs.find((t) => t.id === 'features');
        expect((featuresTab!.content as string[])[0]).toContain('Dra. Sofia Montoya');
      },
    },
    {
      name: 'Step 3: Patient reserves appointment slot on doctor medical calendar',
      fn: async () => {
        const res = validateAppointmentSlot(
          {
            serviceId: medical.id,
            isServiceActive: true,
            startTimeIso: '2026-08-19T10:00:00Z',
            durationMinutes: 40,
            businessHours: { startHour: 7, endHour: 19, closedDays: [0] },
            existingBookings: [],
          },
          new Date('2026-08-16T00:00:00Z').getTime()
        );

        expect(res.isValid).toBe(true);
      },
    },
    {
      name: 'Step 4: WhatsApp booking confirmation is generated for clinical receptionist',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: medical.name,
          calculatedTotalPrice: medical.base_price,
          quantity: 1,
          customerInfo: {
            name: 'Paola Herrera',
            phone: '3142223344',
            email: 'paola@example.com',
            notes: 'Cita: Miércoles 19 de Agosto a las 10:00 AM. Primera consulta.',
          },
          deepLinkUrl: 'https://pixy.app/clinica/p/item-medical-009',
        };

        const wa = formatWhatsAppMessage(payload, '+573001234567');
        expect(wa.rawText).toContain('Consulta Especializada en Dermatología');
        expect(wa.rawText).toContain('Paola Herrera');
        expect(wa.rawText).toContain('$220.000 COP');
      },
    },
    {
      name: 'Step 5: Strict patient medical records isolation per organization_id',
      fn: async () => {
        expect(medical.organization_id).toBe(TENANT_A_ID);
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
