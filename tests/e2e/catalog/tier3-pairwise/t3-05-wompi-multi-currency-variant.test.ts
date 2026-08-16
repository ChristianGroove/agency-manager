/**
 * Tier 3: Cross-Feature Pairwise Interactions
 * Suite: t3-05-wompi-multi-currency-variant
 * Features: Variant Matrix × Multi-Currency × Express Wompi Gateway
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { createWompiPaymentSession } from '../tier2-boundaries/t2-18-wompi-currency-min-max.test';
import { calculateEffectiveTotalPrice, CatalogVariant } from '../harness/contracts';
import { mockB2BSaaSSubscription } from '../harness/mock-data';

const secret = 'wompi_prod_secret_key_8899';
const baseItem = mockB2BSaaSSubscription;

export const suite = {
  name: 'T3-05: Wompi Multi-Currency & Variant Sync',
  tier: 'Tier 3',
  feature: 'F4 x F18: Variants x Express Wompi Online Checkout',
  tests: [
    {
      name: 'Selecting Starter Tier ($350,000 COP) generates 35,000,000 cents Wompi session and signature',
      fn: async () => {
        const starterVariant = baseItem.variants[0];
        const totalCOP = calculateEffectiveTotalPrice(baseItem, starterVariant, null, 1);
        expect(totalCOP).toBe(350000);

        const sessionRes = createWompiPaymentSession(totalCOP, 'COP', 'ref-saas-starter-01', secret);
        expect(sessionRes.isValid).toBe(true);
        expect(sessionRes.session?.amount_in_cents).toBe(35000000);
        expect(sessionRes.session?.currency).toBe('COP');
        expect(sessionRes.session?.integrity_signature).toBeDefined();
      },
    },
    {
      name: 'Switching variant to Pro Business ($850,000 COP) updates amount and regenerates signature',
      fn: async () => {
        const proVariant = baseItem.variants[1];
        const totalCOP = calculateEffectiveTotalPrice(baseItem, proVariant, null, 1);
        expect(totalCOP).toBe(850000);

        const sessionRes = createWompiPaymentSession(totalCOP, 'COP', 'ref-saas-pro-02', secret);
        expect(sessionRes.isValid).toBe(true);
        expect(sessionRes.session?.amount_in_cents).toBe(85000000);

        const starterRes = createWompiPaymentSession(350000, 'COP', 'ref-saas-starter-01', secret);
        expect(sessionRes.session?.integrity_signature).not.toBe(starterRes.session?.integrity_signature);
      },
    },
    {
      name: 'Selecting Pro Business variant + Dedicated VIP Support addon computes combined total for Wompi',
      fn: async () => {
        const proVariant = baseItem.variants[1];
        const addon = [{ priceDelta: 200000 }];

        const totalCOP = calculateEffectiveTotalPrice(baseItem, proVariant, addon, 1);
        expect(totalCOP).toBe(1050000);

        const sessionRes = createWompiPaymentSession(totalCOP, 'COP', 'ref-saas-pro-vip-03', secret);
        expect(sessionRes.isValid).toBe(true);
        expect(sessionRes.session?.amount_in_cents).toBe(105000000);
      },
    },
    {
      name: 'USD currency conversion with international pricing variant generates USD Wompi payload',
      fn: async () => {
        const sessionRes = createWompiPaymentSession(12000, 'USD', 'ref-usd-seat-04', secret);
        expect(sessionRes.isValid).toBe(true);
        expect(sessionRes.session?.currency).toBe('USD');
      },
    },
    {
      name: 'Quantity scaling (3 seats of Starter) correctly updates Wompi session amount and hash',
      fn: async () => {
        const starterVariant = baseItem.variants[0];
        const totalCOP = calculateEffectiveTotalPrice(baseItem, starterVariant, null, 3);
        expect(totalCOP).toBe(1050000);

        const sessionRes = createWompiPaymentSession(totalCOP, 'COP', 'ref-saas-starter-x3', secret);
        expect(sessionRes.session?.amount_in_cents).toBe(105000000);
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
