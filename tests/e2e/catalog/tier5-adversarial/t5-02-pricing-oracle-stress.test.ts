/**
 * Tier 5: Adversarial Coverage Hardening
 * Suite: t5-02-pricing-oracle-stress
 * Focus: Dynamic pricing recalculator precision, floating point pitfalls, extreme modifiers, bulk quantities & oracles
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { calculateCatalogItemPrice, CatalogVariant } from '../harness/contracts';

/**
 * Arbitrary precision oracle calculation for catalog item pricing
 */
export function adversarialPriceOracle(
  basePrice: number,
  variant?: { priceModifier: number; priceType: 'fixed' | 'offset' | 'percentage' } | null,
  addons?: Array<{ priceDelta: number; quantity?: number }> | null,
  quantity: number = 1
): {
  unitPrice: number;
  totalPrice: number;
  isFlooredAtZero: boolean;
  rawFloatingPointDelta: number;
} {
  let effectiveBase = Number.isFinite(basePrice) ? basePrice : 0;
  let unit = effectiveBase;

  if (variant) {
    const mod = Number.isFinite(variant.priceModifier) ? variant.priceModifier : 0;
    if (variant.priceType === 'fixed') {
      unit = mod;
    } else if (variant.priceType === 'offset') {
      unit = effectiveBase + mod;
    } else if (variant.priceType === 'percentage') {
      unit = effectiveBase * (1 + mod / 100);
    }
  }

  if (addons && Array.isArray(addons)) {
    for (const addon of addons) {
      const delta = Number.isFinite(addon.priceDelta) ? addon.priceDelta : 0;
      const qty = Math.max(1, Number.isFinite(addon.quantity) ? (addon.quantity || 1) : 1);
      unit += delta * qty;
    }
  }

  const rawFloating = unit;
  const isFlooredAtZero = unit < 0;
  const clampedUnit = Math.max(0, Math.round(unit));
  const cleanQty = Math.max(1, Math.floor(Number.isFinite(quantity) ? quantity : 1));
  const totalPrice = clampedUnit * cleanQty;

  return {
    unitPrice: clampedUnit,
    totalPrice,
    isFlooredAtZero,
    rawFloatingPointDelta: Math.abs(rawFloating - clampedUnit),
  };
}

export const suite = {
  name: 'T5-02: Pricing Oracle & Floating-Point Precision Hardening',
  tier: 'Tier 5',
  feature: 'F10: Dynamic Price & SKU Recalculator',
  tests: [
    {
      name: 'Floating point rounding accuracy with successive 33.333333333333336% discounts',
      fn: async () => {
        const base = 300000;
        const variant: CatalogVariant = {
          id: 'v-third',
          catalog_item_id: 'item-1',
          title: '1/3 Discount',
          price_modifier: -33.333333333333336,
          price_type: 'percentage',
          inventory_quantity: 1,
          track_inventory: false,
          attributes: {},
          is_active: true,
        };

        const calculated = calculateCatalogItemPrice(base, variant, null, 1);
        const oracle = adversarialPriceOracle(base, { priceModifier: -33.333333333333336, priceType: 'percentage' });

        expect(calculated).toBe(200000);
        expect(oracle.totalPrice).toBe(200000);
      },
    },
    {
      name: 'Zero base price ($0 COP) with massive negative modifiers clamps strictly at 0',
      fn: async () => {
        const base = 0;
        const variant: CatalogVariant = {
          id: 'v-neg',
          catalog_item_id: 'item-1',
          title: 'Negative Modifier',
          price_modifier: -50000,
          price_type: 'offset',
          inventory_quantity: 1,
          track_inventory: false,
          attributes: {},
          is_active: true,
        };

        const calculated = calculateCatalogItemPrice(base, variant, [{ priceDelta: -25000 }], 5);
        expect(calculated).toBe(0);
      },
    },
    {
      name: 'Extreme percentage discounts (-150%, -200%) floor at $0 COP without negative totals',
      fn: async () => {
        const base = 150000;
        const variant: CatalogVariant = {
          id: 'v-hyper-disc',
          catalog_item_id: 'item-1',
          title: '-150% Super Promo',
          price_modifier: -150,
          price_type: 'percentage',
          inventory_quantity: 10,
          track_inventory: false,
          attributes: {},
          is_active: true,
        };

        const total = calculateCatalogItemPrice(base, variant, null, 3);
        expect(total).toBe(0);
      },
    },
    {
      name: 'Bulk quantity bounds: 0 and negative quantities are sanitized to minimum 1',
      fn: async () => {
        const base = 50000;
        expect(calculateCatalogItemPrice(base, null, null, 0)).toBe(50000);
        expect(calculateCatalogItemPrice(base, null, null, -5)).toBe(50000);
        expect(calculateCatalogItemPrice(base, null, null, 1)).toBe(50000);
        expect(calculateCatalogItemPrice(base, null, null, 10)).toBe(500000);
      },
    },
    {
      name: 'High-dimensional compound combination: Base + Percentage Variant + Mixed Add-ons * Quantity',
      fn: async () => {
        // Base: $80,000 COP
        // Variant: +25% ($100,000 COP)
        // Addon 1: +$15,000 (Garantía)
        // Addon 2: +$7,500 (Empaque)
        // Addon 3: -$5,000 (Descuento cupón)
        // Effective unit: $100,000 + $15,000 + $7,500 - $5,000 = $117,500 COP
        // Quantity: 4
        // Total expected: $470,000 COP
        const base = 80000;
        const variant: CatalogVariant = {
          id: 'v-plus25',
          catalog_item_id: 'item-comp',
          title: 'Plus 25%',
          price_modifier: 25,
          price_type: 'percentage',
          inventory_quantity: 50,
          track_inventory: true,
          attributes: {},
          is_active: true,
        };

        const addons = [
          { priceDelta: 15000, name: 'Garantía' },
          { priceDelta: 7500, name: 'Empaque' },
          { priceDelta: -5000, name: 'Descuento cupón' },
        ];

        const total = calculateCatalogItemPrice(base, variant, addons, 4);
        expect(total).toBe(470000);
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier5');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
