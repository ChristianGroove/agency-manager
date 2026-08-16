/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-18-wompi-currency-min-max
 * Feature: F18 - Express Wompi Online Checkout
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { WompiSessionPayload } from '../harness/contracts';
import { createHash } from 'crypto';

export function createWompiPaymentSession(
  amountCOP: number,
  currency: string,
  reference: string,
  integritySecret: string,
  expiresAtIso?: string
): {
  isValid: boolean;
  session?: WompiSessionPayload;
  error?: string;
} {
  const MIN_AMOUNT_COP = 1000;
  const MAX_AMOUNT_COP = 50000000;
  const ALLOWED_CURRENCIES = ['COP', 'USD'];

  if (amountCOP < MIN_AMOUNT_COP) {
    return {
      isValid: false,
      error: `Transaction amount $${amountCOP} COP is below Wompi gateway minimum of $${MIN_AMOUNT_COP} COP`,
    };
  }

  if (amountCOP > MAX_AMOUNT_COP) {
    return {
      isValid: false,
      error: `Transaction amount $${amountCOP} COP exceeds Wompi gateway maximum limit of $${MAX_AMOUNT_COP} COP`,
    };
  }

  if (!ALLOWED_CURRENCIES.includes(currency.toUpperCase())) {
    return {
      isValid: false,
      error: `Invalid currency code: ${currency}. Only COP and USD are supported.`,
    };
  }

  if (expiresAtIso) {
    const expiryTime = new Date(expiresAtIso).getTime();
    if (isNaN(expiryTime) || expiryTime <= Date.now()) {
      return {
        isValid: false,
        error: 'Payment expiration timestamp must be in the future',
      };
    }
  }

  const amountInCents = Math.round(amountCOP * 100);
  const signatureRaw = `${reference}${amountInCents}${currency}${integritySecret}`;
  const integritySignature = createHash('sha256').update(signatureRaw).digest('hex');

  const session: WompiSessionPayload = {
    currency,
    amount_in_cents: amountInCents,
    reference,
    redirect_url: 'https://pixy.app/checkout/complete',
    integrity_signature: integritySignature,
  };

  return { isValid: true, session };
}

export const suite = {
  name: 'T2-18: Wompi Currency, Minimum/Maximum & Integrity Signature',
  tier: 'Tier 2',
  feature: 'F18: Express Wompi Online Checkout',
  tests: [
    {
      name: 'Amount below 1,000 COP minimum threshold is rejected',
      fn: async () => {
        const res = createWompiPaymentSession(500, 'COP', 'ref-001', 'test_integrity_secret');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('below Wompi gateway minimum of $1000 COP');
      },
    },
    {
      name: 'Amount exceeding 50,000,000 COP gateway cap is rejected with error',
      fn: async () => {
        const res = createWompiPaymentSession(65000000, 'COP', 'ref-002', 'test_integrity_secret');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('exceeds Wompi gateway maximum limit');
      },
    },
    {
      name: 'Unsupported currency (EUR / GBP) is rejected',
      fn: async () => {
        const res = createWompiPaymentSession(50000, 'EUR', 'ref-003', 'test_integrity_secret');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Invalid currency code: EUR');
      },
    },
    {
      name: 'SHA-256 integrity signature is generated and detects tampering',
      fn: async () => {
        const secret = 'prod_integrity_secret_key_123';
        const res = createWompiPaymentSession(150000, 'COP', 'ref-order-99', secret);
        expect(res.isValid).toBe(true);
        expect(res.session?.amount_in_cents).toBe(15000000);

        const expectedHash = createHash('sha256')
          .update('ref-order-9915000000COPprod_integrity_secret_key_123')
          .digest('hex');

        expect(res.session?.integrity_signature).toBe(expectedHash);

        const tamperedHash = createHash('sha256')
          .update('ref-order-999999999COPprod_integrity_secret_key_123')
          .digest('hex');
        expect(res.session?.integrity_signature).not.toBe(tamperedHash);
      },
    },
    {
      name: 'Payment expiration timestamp in the past is rejected',
      fn: async () => {
        const pastTimestamp = '2020-01-01T00:00:00Z';
        const res = createWompiPaymentSession(50000, 'COP', 'ref-004', 'secret', pastTimestamp);
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('expiration timestamp must be in the future');
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
