/**
 * Tier 3: Cross-Feature Pairwise Interactions
 * Suite: t3-04-crm-quote-custom-options
 * Features: Storefront Detail Modal × Dynamic Options × CRM Lead & Quote Engine
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { StorefrontActionPayload } from '../harness/contracts';
import { submitStorefrontQuoteToCRM, CRMSubmissionState } from '../tier2-boundaries/t2-17-crm-lead-dedup-resilience.test';
import { mockAgencyService, TENANT_A_ID } from '../harness/mock-data';

const crmState: CRMSubmissionState = { recentSubmissions: new Map() };

export const suite = {
  name: 'T3-04: CRM Quote Custom Options Pairwise',
  tier: 'Tier 3',
  feature: 'F6 x F5 x F17: Detail Modal x Addons x CRM Lead & Quote',
  tests: [
    {
      name: 'Storefront selection with multiple add-ons creates structured CRM quote items',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: mockAgencyService.id,
          calculatedTotalPrice: 2500000 + 800000,
          quantity: 1,
          selectedAddons: [
            {
              groupId: 'addon-ugc-creatives',
              optionId: 'ugc-4videos',
              name: '4 Videos UGC con Creadores Profesionales',
              priceDelta: 800000,
            },
          ],
          customerInfo: {
            name: 'Sebastián Restrepo',
            email: 'sebastian@empresa-colombia.com',
            phone: '3109876543',
            notes: 'Requerimos inicio la próxima semana.',
          },
          deepLinkUrl: 'https://pixy.app/agency/p/item-agency-003',
        };

        const res = submitStorefrontQuoteToCRM(payload, TENANT_A_ID, crmState);
        expect(res.success).toBe(true);
        expect(res.draft).toBeDefined();

        expect(res.draft?.lead.name).toBe('Sebastián Restrepo');
        expect(res.draft?.lead.email).toBe('sebastian@empresa-colombia.com');
        expect(res.draft?.lead.organization_id).toBe(TENANT_A_ID);
        expect(res.draft?.lead.source).toBe('Storefront Portal');

        expect(res.draft?.quote.total_amount).toBe(3300000);
        expect(res.draft?.quote.status).toBe('draft');
        expect(res.draft?.quote.items).toHaveLength(1);
        expect(res.draft?.quote.items[0].addons).toHaveLength(1);
        expect(res.draft?.quote.items[0].addons![0].name).toContain('4 Videos UGC');
      },
    },
    {
      name: 'Quantity multiplier updates total_amount in created CRM quote accurately',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'srv-license-seat',
          calculatedTotalPrice: 150000 * 5,
          quantity: 5,
          customerInfo: {
            name: 'Clara Ortiz',
            email: 'clara@startup.co',
            phone: '3201112233',
          },
          deepLinkUrl: 'https://pixy.app/saas/p/seat',
        };

        const res = submitStorefrontQuoteToCRM(payload, TENANT_A_ID, crmState);
        expect(res.success).toBe(true);
        expect(res.draft?.quote.total_amount).toBe(750000);
        expect(res.draft?.quote.items[0].quantity).toBe(5);
        expect(res.draft?.quote.items[0].unit_price).toBe(150000);
      },
    },
    {
      name: 'Enforces organization_id matching on both lead and quote records',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'srv-test',
          calculatedTotalPrice: 100000,
          quantity: 1,
          customerInfo: { name: 'Tenant Org Test', email: 'tenant@test.com', phone: '3000000000' },
          deepLinkUrl: 'https://pixy.app/test',
        };

        const res = submitStorefrontQuoteToCRM(payload, 'tenant-org-isolated-99', crmState);
        expect(res.draft?.lead.organization_id).toBe('tenant-org-isolated-99');
        expect(res.draft?.quote.organization_id).toBe('tenant-org-isolated-99');
      },
    },
    {
      name: 'Preserves variant ID in quote item line for exact inventory reconciliation',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'item-shoe-01',
          variantId: 'var-shoe-size-42',
          selectedVariant: {
            id: 'var-shoe-size-42',
            catalog_item_id: 'item-shoe-01',
            title: 'Talla 42 / Negro',
            price_modifier: 0,
            price_type: 'offset',
            inventory_quantity: 10,
            track_inventory: true,
            attributes: { Talla: '42', Color: 'Negro' },
            is_active: true,
          },
          calculatedTotalPrice: 220000,
          quantity: 1,
          customerInfo: { name: 'David Gil', email: 'david@gil.com', phone: '3145556677' },
          deepLinkUrl: 'https://pixy.app/shoes/p/1?variant=var-shoe-size-42',
        };

        const res = submitStorefrontQuoteToCRM(payload, TENANT_A_ID, crmState);
        expect(res.draft?.quote.items[0].variant_id).toBe('var-shoe-size-42');
        expect(res.draft?.quote.items[0].item_name).toBe('Talla 42 / Negro');
      },
    },
    {
      name: 'Rejects quote creation when customer email is omitted',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'item-anon',
          calculatedTotalPrice: 50000,
          quantity: 1,
          customerInfo: { name: 'Sin Email', email: '', phone: '3000000000' },
          deepLinkUrl: 'https://pixy.app/test',
        };

        const res = submitStorefrontQuoteToCRM(payload, TENANT_A_ID, crmState);
        expect(res.success).toBe(false);
        expect(res.error).toContain('Valid customer email is required');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier3');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
