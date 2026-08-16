/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-02-b2b-saas-subscriptions
 * Domain: S2 - B2B SaaS Cloud Platform Subscriptions
 * Features Exercised: F3, F4, F6, F9, F10, F11, F13, F15, F17, F18, F20, F24, F25
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { mockB2BSaaSSubscription, TENANT_A_ID } from '../harness/mock-data';
import { calculateEffectiveTotalPrice, StorefrontActionPayload } from '../harness/contracts';
import { parseAndSanitizeVideoUrl } from '../tier2-boundaries/t2-09-video-malformed.test';
import { parseSpecificationTabs } from '../tier2-boundaries/t2-11-spec-tabs-empty.test';
import { submitStorefrontQuoteToCRM, CRMSubmissionState } from '../tier2-boundaries/t2-17-crm-lead-dedup-resilience.test';
import { createWompiPaymentSession } from '../tier2-boundaries/t2-18-wompi-currency-min-max.test';

const saas = mockB2BSaaSSubscription;
const crmState: CRMSubmissionState = { recentSubmissions: new Map() };

export const suite = {
  name: 'T4-02: Scenario S2 - B2B SaaS Subscriptions',
  tier: 'Tier 4',
  feature: 'S2: B2B SaaS Cloud Platform Subscriptions',
  tests: [
    {
      name: 'Step 1: SaaS product classification verifies recurring subscription billing metadata',
      fn: async () => {
        expect(saas.classification).toBe('subscription');
        expect(saas.type).toBe('recurring');
        expect(saas.frequency).toBe('monthly');
        expect(saas.track_inventory).toBe(false);
      },
    },
    {
      name: 'Step 2: Video demo preview embed is sanitized with secure YouTube iframe parameters',
      fn: async () => {
        const videoRes = parseAndSanitizeVideoUrl(saas.video_url);
        expect(videoRes.isValid).toBe(true);
        expect(videoRes.provider).toBe('youtube');
        expect(videoRes.embedUrl).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
        expect(videoRes.sandboxAttributes).toContain('allow-scripts');
      },
    },
    {
      name: 'Step 3: Specification tabs render DIAN Electronic Invoicing features and 99.9% SLA warranty',
      fn: async () => {
        const tabs = parseSpecificationTabs(saas.description, saas.specifications);
        expect(tabs.length).toBeGreaterThanOrEqual(3);

        const featuresTab = tabs.find((t) => t.id === 'features');
        expect(featuresTab).toBeDefined();
        expect((featuresTab!.content as string[])).toContain('Facturación Electrónica DIAN Ilimitada');

        const warrantyTab = tabs.find((t) => t.id === 'warranty');
        expect(warrantyTab).toBeDefined();
        expect(warrantyTab!.content).toContain('SLA de 99.9% uptime');
      },
    },
    {
      name: 'Step 4: Enterprise customer chooses Pro Business tier with 25 users + 24/7 VIP Support addon',
      fn: async () => {
        const proVariant = saas.variants[1];
        const vipAddon = saas.addon_groups[0].options[1];

        const totalCOP = calculateEffectiveTotalPrice(saas, proVariant, [{ priceDelta: vipAddon.price_delta }], 1);
        expect(totalCOP).toBe(1050000);
      },
    },
    {
      name: 'Step 5: Automated checkout creates CRM Lead and signs Wompi recurring session payload',
      fn: async () => {
        const proVariant = saas.variants[1];
        const vipAddon = saas.addon_groups[0].options[1];

        const payload: StorefrontActionPayload = {
          itemId: saas.id,
          variantId: proVariant.id,
          selectedVariant: proVariant,
          selectedAddons: [{ groupId: 'g1', optionId: vipAddon.id, name: vipAddon.name, priceDelta: vipAddon.price_delta }],
          calculatedTotalPrice: 1050000,
          quantity: 1,
          customerInfo: {
            name: 'Carlos Sarmiento',
            email: 'carlos@holding-colombia.com',
            phone: '3118889900',
            notes: 'Requiere facturación electrónica a nombre de Holding SAS',
          },
          deepLinkUrl: 'https://pixy.app/saas/p/item-saas-002?variant=var-pro',
        };

        const crm = submitStorefrontQuoteToCRM(payload, TENANT_A_ID, crmState);
        expect(crm.success).toBe(true);
        expect(crm.draft?.lead.email).toBe('carlos@holding-colombia.com');
        expect(crm.draft?.quote.total_amount).toBe(1050000);

        const wompi = createWompiPaymentSession(1050000, 'COP', 'ref-saas-inv-2026', 'wompi_sec');
        expect(wompi.isValid).toBe(true);
        expect(wompi.session?.amount_in_cents).toBe(105000000);
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
