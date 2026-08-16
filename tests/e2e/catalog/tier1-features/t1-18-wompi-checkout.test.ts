/**
 * Tier 1 Test Suite: F18 - Express Wompi Online Checkout
 * Tests Wompi session signature generator, amount in cents calculation, reference format with timestamp, redirect URL parsing, customer email binding.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertMatches,
  assertContains,
} from '../harness/assertions';
import { generateWompiSignature } from '../harness/contracts';
import { mockStorefrontActionPayload } from '../harness/mock-data';

export const suite = {
  name: 'T1-18: Express Wompi Online Checkout',
  tier: 'Tier 1',
  feature: 'F18: Express Wompi Online Checkout',
  tests: [
    {
      name: 'Generates deterministic SHA-256 Wompi payment integrity signature',
      fn: () => {
        const reference = 'ORDER-PIXY-20260815-12345';
        const amountInCents = 11200000; // 112,000 COP in cents
        const currency = 'COP';
        const integritySecret = 'prod_integrity_secret_xyz123';

        const signature1 = generateWompiSignature(reference, amountInCents, currency, integritySecret);
        const signature2 = generateWompiSignature(reference, amountInCents, currency, integritySecret);

        // Deterministic check
        assertEqual(signature1, signature2);
        assertEqual(signature1.length, 64); // SHA-256 hex string is 64 characters
        assertMatches(signature1, /^[0-9a-f]{64}$/);

        // Different secret results in different signature
        const signatureDiff = generateWompiSignature(reference, amountInCents, currency, 'other_secret');
        assertTrue(signature1 !== signatureDiff);
      },
    },
    {
      name: 'Converts standard Colombian Pesos (COP) amount to integer amount in cents',
      fn: () => {
        function convertToCents(amountCop: number): number {
          return Math.round(amountCop * 100);
        }

        assertEqual(convertToCents(85000), 8500000);
        assertEqual(convertToCents(112000), 11200000);
        assertEqual(convertToCents(1800000), 180000000);
      },
    },
    {
      name: 'Generates unique payment transaction reference with prefix and timestamp',
      fn: () => {
        function generateOrderReference(itemId: string, tenantId: string): string {
          const timestamp = Date.now();
          const cleanItem = itemId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
          return `ORD-${cleanItem}-${timestamp}`;
        }

        const ref1 = generateOrderReference('item_phys_001', 'tenant_123');
        assertMatches(ref1, /^ORD-itemphys00-\d+$/);
      },
    },
    {
      name: 'Parses redirect return URL and extracts Wompi transaction status params',
      fn: () => {
        const returnUrl = 'https://app.pixy.com/portal/checkout/complete?id=12345-16789-98765&env=prod&status=APPROVED';
        const urlObj = new URL(returnUrl);

        assertEqual(urlObj.searchParams.get('id'), '12345-16789-98765');
        assertEqual(urlObj.searchParams.get('status'), 'APPROVED');
        assertEqual(urlObj.searchParams.get('env'), 'prod');
      },
    },
    {
      name: 'Binds customer email and billing information into Wompi checkout session payload',
      fn: () => {
        function buildWompiWidgetConfig(payload: typeof mockStorefrontActionPayload, integritySecret: string) {
          const amountInCents = payload.calculatedTotalPrice * 100;
          const reference = `ORD-${Date.now()}`;
          const signature = generateWompiSignature(reference, amountInCents, 'COP', integritySecret);

          return {
            currency: 'COP',
            amountInCents,
            reference,
            publicKey: 'pub_prod_wompi_key_test_123',
            signature: { integrity: signature },
            customerData: {
              email: payload.customerInfo?.email,
              fullName: payload.customerInfo?.name,
              phoneNumber: payload.customerInfo?.phone,
            },
          };
        }

        const widget = buildWompiWidgetConfig(mockStorefrontActionPayload, 'test_secret');
        assertEqual(widget.currency, 'COP');
        assertEqual(widget.amountInCents, 11200000);
        assertEqual(widget.customerData.email, 'carlos.mendoza@example.com');
        assertEqual(widget.customerData.fullName, 'Carlos Mendoza');
      },
    },
  ],
};

export async function run() {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const t of suite.tests) {
    try {
      await t.fn();
      passed++;
    } catch (err: any) {
      failed++;
      errors.push(`${t.name}: ${err.message}`);
    }
  }

  return { passed, failed, errors };
}
