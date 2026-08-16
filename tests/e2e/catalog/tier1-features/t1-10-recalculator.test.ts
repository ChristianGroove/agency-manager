/**
 * Tier 1 Test Suite: F10 - Dynamic Price & SKU Recalculator
 * Tests base price + variant fixed offset, base price + percentage modifier, multiple addons aggregation, quantity multiplier, negative price floor protection.
 */

import {
  assertEqual,
  assertTrue,
  assertGreaterThanOrEqual,
} from '../harness/assertions';
import {
  calculateCatalogItemPrice,
  CatalogVariant,
} from '../harness/contracts';

export const suite = {
  name: 'T1-10: Dynamic Price & SKU Recalculator',
  tier: 'Tier 1',
  feature: 'F10: Dynamic Price & SKU Recalculator',
  tests: [
    {
      name: 'Calculates price with fixed and offset variant price modifiers',
      fn: () => {
        const basePrice = 85000;

        // Fixed price variant (overrides base price)
        const fixedVariant: CatalogVariant = {
          id: 'v_fix',
          catalog_item_id: 'item_1',
          title: 'Fixed Tier',
          price_modifier: 120000,
          price_type: 'fixed',
          inventory_quantity: 10,
          track_inventory: true,
          attributes: {},
          is_active: true,
        };
        const priceFixed = calculateCatalogItemPrice(basePrice, fixedVariant, []);
        assertEqual(priceFixed, 120000);

        // Offset price variant (adds to base price)
        const offsetVariant: CatalogVariant = {
          id: 'v_off',
          catalog_item_id: 'item_1',
          title: 'XL Size Offset',
          price_modifier: 7500,
          price_type: 'offset',
          inventory_quantity: 10,
          track_inventory: true,
          attributes: {},
          is_active: true,
        };
        const priceOffset = calculateCatalogItemPrice(basePrice, offsetVariant, []);
        assertEqual(priceOffset, 92500);
      },
    },
    {
      name: 'Calculates price with percentage modifier (surcharges and discounts)',
      fn: () => {
        const basePrice = 100000;

        // +25% surcharge variant
        const surchargeVariant: CatalogVariant = {
          id: 'v_pct_plus',
          catalog_item_id: 'item_1',
          title: 'Express Rush (+25%)',
          price_modifier: 25,
          price_type: 'percentage',
          inventory_quantity: 10,
          track_inventory: true,
          attributes: {},
          is_active: true,
        };
        const priceSurcharge = calculateCatalogItemPrice(basePrice, surchargeVariant, []);
        assertEqual(priceSurcharge, 125000);

        // -15% discount variant
        const discountVariant: CatalogVariant = {
          id: 'v_pct_minus',
          catalog_item_id: 'item_1',
          title: 'Student Discount (-15%)',
          price_modifier: -15,
          price_type: 'percentage',
          inventory_quantity: 10,
          track_inventory: true,
          attributes: {},
          is_active: true,
        };
        const priceDiscount = calculateCatalogItemPrice(basePrice, discountVariant, []);
        assertEqual(priceDiscount, 85000);
      },
    },
    {
      name: 'Aggregates multiple optional and required addon price deltas seamlessly',
      fn: () => {
        const basePrice = 50000;
        const selectedAddons = [
          { name: 'Packaging Box', priceDelta: 8000 },
          { name: 'Engraved Text', priceDelta: 12000 },
          { name: 'Greeting Card', priceDelta: 4000 },
          { name: 'Free Ribbon', priceDelta: 0 },
        ];

        const total = calculateCatalogItemPrice(basePrice, null, selectedAddons, 1);
        // 50000 + 8000 + 12000 + 4000 + 0 = 74000
        assertEqual(total, 74000);
      },
    },
    {
      name: 'Applies quantity multiplier across combined base, variant, and addons',
      fn: () => {
        const basePrice = 40000;
        const variant: CatalogVariant = {
          id: 'v_sub',
          catalog_item_id: 'item_1',
          title: 'Premium Finish',
          price_modifier: 10000,
          price_type: 'offset',
          inventory_quantity: 50,
          track_inventory: true,
          attributes: {},
          is_active: true,
        };
        const addons = [{ name: 'Custom Bag', priceDelta: 5000 }];

        // Single unit price = 40000 + 10000 + 5000 = 55000
        const qty1 = calculateCatalogItemPrice(basePrice, variant, addons, 1);
        assertEqual(qty1, 55000);

        // 3 units = 55000 * 3 = 165000
        const qty3 = calculateCatalogItemPrice(basePrice, variant, addons, 3);
        assertEqual(qty3, 165000);

        // 10 units = 55000 * 10 = 550000
        const qty10 = calculateCatalogItemPrice(basePrice, variant, addons, 10);
        assertEqual(qty10, 550000);
      },
    },
    {
      name: 'Enforces negative price floor protection preventing total price below zero',
      fn: () => {
        const basePrice = 20000;
        const extremeDiscountVariant: CatalogVariant = {
          id: 'v_neg',
          catalog_item_id: 'item_1',
          title: 'Extreme Discount',
          price_modifier: -50000, // Offset larger than base price
          price_type: 'offset',
          inventory_quantity: 10,
          track_inventory: true,
          attributes: {},
          is_active: true,
        };

        const calculated = calculateCatalogItemPrice(basePrice, extremeDiscountVariant, []);
        assertEqual(calculated, 0, 'Price must floor at 0 rather than becoming negative');
        assertGreaterThanOrEqual(calculated, 0);
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
