/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-03-digital-marketing-agency
 * Domain: S3 - Creative & Digital Marketing Agency Retainer
 * Features Exercised: F3, F5, F6, F9, F11, F13, F17, F19, F24, F25
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { mockAgencyService, TENANT_A_ID } from '../harness/mock-data';
import { calculateEffectiveTotalPrice, StorefrontActionPayload } from '../harness/contracts';
import { generateAICopyWithResilience } from '../tier2-boundaries/t2-13-ai-timeout-fallback.test';
import { parseSpecificationTabs } from '../tier2-boundaries/t2-11-spec-tabs-empty.test';
import { validateAppointmentSlot } from '../tier2-boundaries/t2-19-appointment-slot-edge.test';
import { submitStorefrontQuoteToCRM, CRMSubmissionState } from '../tier2-boundaries/t2-17-crm-lead-dedup-resilience.test';

const agency = mockAgencyService;
const crmState: CRMSubmissionState = { recentSubmissions: new Map() };

export const suite = {
  name: 'T4-03: Scenario S3 - Digital Marketing Agency',
  tier: 'Tier 4',
  feature: 'S3: Professional Services & Marketing Agency Retainer',
  tests: [
    {
      name: 'Step 1: Service classification and recurring retainer specifications validation',
      fn: async () => {
        expect(agency.classification).toBe('service');
        expect(agency.type).toBe('recurring');
        expect(agency.base_price).toBe(2500000);
      },
    },
    {
      name: 'Step 2: AI Copywriter generates conversion-focused proposal description and deliverables',
      fn: async () => {
        const mockModel = async () =>
          JSON.stringify({
            title: 'Escalamiento de Pauta Publicitaria con IA & UGC',
            description: 'Multiplica tus ventas en Shopify y MercadoLibre con pauta de alta conversión en Meta, TikTok y Google.',
            bulletPoints: [
              'Gestión y optimización continua de campañas pagas',
              'Producción de 4 guiones de venta UGC de alta retención',
              'Dashboard de métricas en tiempo real con ROAS atribuido',
            ],
          });

        const aiRes = await generateAICopyWithResilience({ itemName: 'Paid Ads Growth' }, mockModel);
        expect(aiRes.success).toBe(true);

        const tabs = parseSpecificationTabs(aiRes.description, { deliverables: aiRes.bulletPoints });
        expect(tabs).toHaveLength(2);
        expect(tabs[1].id).toBe('deliverables');
      },
    },
    {
      name: 'Step 3: Client selects retainer base + 8 Videos UGC extra pack addon',
      fn: async () => {
        const ugc8Pack = agency.addon_groups[0].options[1];

        const total = calculateEffectiveTotalPrice(
          agency,
          null,
          [{ priceDelta: ugc8Pack.price_delta }],
          1
        );

        expect(total).toBe(3900000);
      },
    },
    {
      name: 'Step 4: Client books initial strategy onboarding discovery call on calendar',
      fn: async () => {
        const slotRes = validateAppointmentSlot(
          {
            serviceId: agency.id,
            isServiceActive: true,
            startTimeIso: '2026-08-18T15:00:00Z',
            durationMinutes: 45,
            businessHours: { startHour: 8, endHour: 18, closedDays: [0, 6] },
            existingBookings: [],
          },
          new Date('2026-08-16T00:00:00Z').getTime()
        );

        expect(slotRes.isValid).toBe(true);
      },
    },
    {
      name: 'Step 5: Direct CRM Quote draft and lead pipeline creation',
      fn: async () => {
        const ugc8Pack = agency.addon_groups[0].options[1];
        const payload: StorefrontActionPayload = {
          itemId: agency.id,
          calculatedTotalPrice: 3900000,
          quantity: 1,
          selectedAddons: [{ groupId: 'g-ugc', optionId: ugc8Pack.id, name: ugc8Pack.name, priceDelta: ugc8Pack.price_delta }],
          customerInfo: {
            name: 'Juliana Castro',
            email: 'juliana@modacolombia.com',
            phone: '3187654321',
            notes: 'Queremos lanzar la campaña para la colección de Primavera.',
          },
          deepLinkUrl: 'https://pixy.app/agency/p/item-agency-003',
        };

        const crm = submitStorefrontQuoteToCRM(payload, TENANT_A_ID, crmState);
        expect(crm.success).toBe(true);
        expect(crm.draft?.quote.total_amount).toBe(3900000);
        expect(crm.draft?.lead.name).toBe('Juliana Castro');
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
