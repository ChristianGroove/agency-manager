/**
 * Tier 3: Cross-Feature Pairwise Interactions
 * Suite: t3-01-variant-addon-pricing
 * Features: Dynamic Variants × Dynamic Addons × Price Recalculator
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { calculateEffectiveTotalPrice, CatalogVariant } from '../harness/contracts';
import { mockFashionApparel } from '../harness/mock-data';

const baseItem = { base_price: 180000 };

export const suite = {
  name: 'T3-01: Variant × Addon × Pricing Combinations',
  tier: 'Tier 3',
  feature: 'F4 x F5 x F10: Variants x Addons x Price Recalculator',
  tests: [
    {
      name: 'Pairwise [Offset Variant + 0 Addons + Qty 1] recalculates exactly',
      fn: async () => {
        const variant: CatalogVariant = {
          ...mockFashionApparel.variants[2],
          price_type: 'offset',
          price_modifier: 15000,
        };

        const total = calculateEffectiveTotalPrice(baseItem, variant, [], 1);
        expect(total).toBe(195000);
      },
    },
    {
      name: 'Pairwise [Offset Variant + 1 Optional Addon + Qty 3] recalculates with quantity multiplier',
      fn: async () => {
        const variant: CatalogVariant = {
          ...mockFashionApparel.variants[2],
          price_type: 'offset',
          price_modifier: 15000,
        };
        const addons = [{ priceDelta: 35000 }];

        const total = calculateEffectiveTotalPrice(baseItem, variant, addons, 3);
        expect(total).toBe(690000);
      },
    },
    {
      name: 'Pairwise [Fixed Variant + Multiple Addons + Qty 2] overrides base price correctly',
      fn: async () => {
        const fixedVariant: CatalogVariant = {
          id: 'var-fixed-tier',
          catalog_item_id: 'item-1',
          title: 'Edición Diamante',
          price_modifier: 300000,
          price_type: 'fixed',
          inventory_quantity: 5,
          track_inventory: true,
          attributes: {},
          is_active: true,
        };

        const addons = [
          { priceDelta: 20000 },
          { priceDelta: 15000 },
        ];

        const total = calculateEffectiveTotalPrice(baseItem, fixedVariant, addons, 2);
        expect(total).toBe(670000);
      },
    },
    {
      name: 'Pairwise [Percentage Variant + Addons + Qty 10] applies percentage to base then adds addons',
      fn: async () => {
        const pctVariant: CatalogVariant = {
          id: 'var-pct',
          catalog_item_id: 'item-1',
          title: 'Plus (+20%)',
          price_modifier: 20,
          price_type: 'percentage',
          inventory_quantity: 20,
          track_inventory: true,
          attributes: {},
          is_active: true,
        };

        const addons = [{ priceDelta: 10000 }];
        const total = calculateEffectiveTotalPrice(baseItem, pctVariant, addons, 10);
        expect(total).toBe(2260000);
      },
    },
    {
      name: 'Pairwise [No Variant Selected + Default Addons + Qty 1] defaults cleanly to base price',
      fn: async () => {
        const total = calculateEffectiveTotalPrice(baseItem, null, null, 1);
        expect(total).toBe(180000);
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
