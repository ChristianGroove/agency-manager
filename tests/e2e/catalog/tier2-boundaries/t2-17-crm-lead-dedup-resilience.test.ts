/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-17-crm-lead-dedup-resilience
 * Feature: F17 - 1-Click CRM Lead & Quote Request
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { CRMLeadQuoteDraft, StorefrontActionPayload } from '../harness/contracts';

export interface CRMSubmissionState {
  recentSubmissions: Map<string, number>;
}

export function submitStorefrontQuoteToCRM(
  payload: StorefrontActionPayload,
  organizationId: string,
  state: CRMSubmissionState,
  currentTimeMs: number = Date.now(),
  mockDbError: boolean = false
): {
  success: boolean;
  draft?: CRMLeadQuoteDraft;
  error?: string;
  isDebounced?: boolean;
} {
  const customer = payload.customerInfo;
  if (!customer?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
    return { success: false, error: 'Valid customer email is required for CRM quote generation' };
  }

  const rawName = customer.name || 'Cliente Potencial';
  const cleanName = rawName.slice(0, 255).trim();
  const cleanPhone = (customer.phone || '').replace(/[^0-9+]/g, '');

  const dedupKey = `${organizationId}:${customer.email.toLowerCase()}:${payload.itemId}:${payload.calculatedTotalPrice}`;
  const lastSubTime = state.recentSubmissions.get(dedupKey);

  if (lastSubTime && currentTimeMs - lastSubTime < 5000) {
    return {
      success: false,
      isDebounced: true,
      error: 'Duplicate request detected within 5 seconds debounce window',
    };
  }

  if (mockDbError) {
    return { success: false, error: 'Database transaction rolled back due to write failure' };
  }

  state.recentSubmissions.set(dedupKey, currentTimeMs);

  const draft: CRMLeadQuoteDraft = {
    lead: {
      name: cleanName,
      email: customer.email.trim().toLowerCase(),
      phone: cleanPhone,
      source: 'Storefront Portal',
      organization_id: organizationId,
    },
    quote: {
      organization_id: organizationId,
      total_amount: payload.calculatedTotalPrice,
      currency: 'COP',
      status: 'draft',
      items: [
        {
          catalog_item_id: payload.itemId,
          variant_id: payload.variantId,
          item_name: payload.selectedVariant?.title || payload.itemId,
          unit_price: Math.round(payload.calculatedTotalPrice / payload.quantity),
          quantity: payload.quantity,
          subtotal: payload.calculatedTotalPrice,
          addons: payload.selectedAddons?.map((a) => ({ name: a.name, price: a.priceDelta })),
        },
      ],
    },
  };

  return { success: true, draft };
}

export const suite = {
  name: 'T2-17: CRM Lead Deduplication & Transaction Resilience',
  tier: 'Tier 2',
  feature: 'F17: 1-Click CRM Lead & Quote Request',
  tests: [
    {
      name: 'Duplicate quote submission within 5 seconds debounce window is prevented',
      fn: async () => {
        const state: CRMSubmissionState = { recentSubmissions: new Map() };
        const payload: StorefrontActionPayload = {
          itemId: 'item-quote-01',
          calculatedTotalPrice: 200000,
          quantity: 1,
          customerInfo: { name: 'Juan Perez', email: 'juan@empresa.com', phone: '3101234567' },
          deepLinkUrl: 'https://pixy.app/store/p/1',
        };

        const first = submitStorefrontQuoteToCRM(payload, 'org-1', state, 10000);
        expect(first.success).toBe(true);

        const second = submitStorefrontQuoteToCRM(payload, 'org-1', state, 12000);
        expect(second.success).toBe(false);
        expect(second.isDebounced).toBe(true);
        expect(second.error).toContain('Duplicate request detected within 5 seconds');
      },
    },
    {
      name: 'Invalid email format is rejected with validation error',
      fn: async () => {
        const state: CRMSubmissionState = { recentSubmissions: new Map() };
        const payload: StorefrontActionPayload = {
          itemId: 'item-quote-01',
          calculatedTotalPrice: 200000,
          quantity: 1,
          customerInfo: { name: 'Bad Email', email: 'not-an-email', phone: '3101234567' },
          deepLinkUrl: 'https://pixy.app/store/p/1',
        };

        const res = submitStorefrontQuoteToCRM(payload, 'org-1', state);
        expect(res.success).toBe(false);
        expect(res.error).toContain('Valid customer email is required');
      },
    },
    {
      name: 'Phone number with letters and special symbols is stripped cleanly',
      fn: async () => {
        const state: CRMSubmissionState = { recentSubmissions: new Map() };
        const payload: StorefrontActionPayload = {
          itemId: 'item-quote-02',
          calculatedTotalPrice: 150000,
          quantity: 1,
          customerInfo: { name: 'Ana Gomez', email: 'ana@example.com', phone: 'Tel: +57 (311) 987-6543 ext 12' },
          deepLinkUrl: 'https://pixy.app/store/p/2',
        };

        const res = submitStorefrontQuoteToCRM(payload, 'org-1', state);
        expect(res.success).toBe(true);
        expect(res.draft?.lead.phone).toBe('+57311987654312');
      },
    },
    {
      name: 'Customer name with 300 characters is clamped to 255 maximum characters',
      fn: async () => {
        const state: CRMSubmissionState = { recentSubmissions: new Map() };
        const longName = 'A'.repeat(300);
        const payload: StorefrontActionPayload = {
          itemId: 'item-quote-03',
          calculatedTotalPrice: 90000,
          quantity: 1,
          customerInfo: { name: longName, email: 'long@example.com', phone: '3000000000' },
          deepLinkUrl: 'https://pixy.app/store/p/3',
        };

        const res = submitStorefrontQuoteToCRM(payload, 'org-1', state);
        expect(res.success).toBe(true);
        expect(res.draft?.lead.name.length).toBe(255);
      },
    },
    {
      name: 'Database transaction rollback on quote failure cleanly reports error',
      fn: async () => {
        const state: CRMSubmissionState = { recentSubmissions: new Map() };
        const payload: StorefrontActionPayload = {
          itemId: 'item-quote-04',
          calculatedTotalPrice: 90000,
          quantity: 1,
          customerInfo: { name: 'Fail Case', email: 'fail@example.com', phone: '3000000000' },
          deepLinkUrl: 'https://pixy.app/store/p/4',
        };

        const res = submitStorefrontQuoteToCRM(payload, 'org-1', state, Date.now(), true);
        expect(res.success).toBe(false);
        expect(res.error).toContain('Database transaction rolled back');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier2');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
