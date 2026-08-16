/**
 * Tier 1 Test Suite: F4 - Dynamic Variants & Attribute Groups
 * Tests color swatch group, size chips group, Cartesian variant generation, inventory per variant, variant activation toggle.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertArrayLength,
  assertMatches,
} from '../harness/assertions';
import {
  validateCatalogAttributeGroup,
  validateCatalogVariant,
  generateCartesianVariants,
} from '../harness/contracts';
import {
  mockColorAttributeGroup,
  mockSizeAttributeGroup,
  mockPhysicalVariants,
} from '../harness/mock-data';

export const suite = {
  name: 'T1-04: Dynamic Variants & Attribute Groups',
  tier: 'Tier 1',
  feature: 'F4: Dynamic Variants & Attribute Groups',
  tests: [
    {
      name: 'Validates color swatch group with hex codes and visual swatch types',
      fn: () => {
        const res = validateCatalogAttributeGroup(mockColorAttributeGroup);
        assertTrue(res.isValid, `Color attribute group invalid: ${res.errors.join(', ')}`);
        assertEqual(mockColorAttributeGroup.swatch_type, 'color');
        assertEqual(mockColorAttributeGroup.options.length, 3);

        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        for (const opt of mockColorAttributeGroup.options) {
          assertTrue(!!opt.swatch_value, `Option ${opt.label} must have swatch_value`);
          assertMatches(opt.swatch_value!, hexRegex, `Option ${opt.label} hex code invalid`);
        }
      },
    },
    {
      name: 'Validates size chips group with ordered pill options',
      fn: () => {
        const res = validateCatalogAttributeGroup(mockSizeAttributeGroup);
        assertTrue(res.isValid);
        assertEqual(mockSizeAttributeGroup.swatch_type, 'pill');
        assertArrayLength(mockSizeAttributeGroup.options, 4);

        // Verify order indices
        const orderIndices = mockSizeAttributeGroup.options.map((o) => o.order_index);
        assertEqual(orderIndices, [0, 1, 2, 3]);
      },
    },
    {
      name: 'Generates Cartesian product variant matrix from multiple attribute groups',
      fn: () => {
        const groups = [
          {
            name: 'Color',
            options: mockColorAttributeGroup.options.map((o) => ({ label: o.label, value: o.value })),
          },
          {
            name: 'Talla',
            options: mockSizeAttributeGroup.options.map((o) => ({ label: o.label, value: o.value })),
          },
        ];

        // 3 colors * 4 sizes = 12 Cartesian combinations
        const generated = generateCartesianVariants(groups, 85000, 'TSH');
        assertArrayLength(generated, 12);

        // Check first combination
        assertEqual(generated[0].title, 'Negro Azabache / S');
        assertEqual(generated[0].sku, 'TSH-BLACK-S');
        assertEqual(generated[0].attributes.Color, 'Negro Azabache');
        assertEqual(generated[0].attributes.Talla, 'S');

        // Check last combination
        assertEqual(generated[11].title, 'Azul Marino / XL');
        assertEqual(generated[11].sku, 'TSH-NAVY-XL');
      },
    },
    {
      name: 'Enforces independent inventory quantity tracking per variant',
      fn: () => {
        assertArrayLength(mockPhysicalVariants, 12);

        for (const variant of mockPhysicalVariants) {
          const res = validateCatalogVariant(variant);
          assertTrue(res.isValid, `Variant ${variant.id} failed validation`);
          assertTrue(typeof variant.inventory_quantity === 'number');
          assertTrue(variant.inventory_quantity >= 0);
        }

        // Verify total variant inventory equals sum of variant quantities
        const totalVariantInventory = mockPhysicalVariants.reduce(
          (sum, v) => sum + v.inventory_quantity,
          0
        );
        assertEqual(totalVariantInventory, 172);
      },
    },
    {
      name: 'Enforces variant activation toggle behavior in storefront selection',
      fn: () => {
        const activeVariants = mockPhysicalVariants.filter((v) => v.is_active);
        const inactiveVariants = mockPhysicalVariants.filter((v) => !v.is_active);

        assertEqual(activeVariants.length, 11);
        assertEqual(inactiveVariants.length, 1);
        assertEqual(inactiveVariants[0].id, 'var_12');
        assertEqual(inactiveVariants[0].title, 'Azul Marino / XL');

        // Inactive variant must be rejected from storefront selection
        function isVariantSelectable(variantId: string): boolean {
          const v = mockPhysicalVariants.find((item) => item.id === variantId);
          return !!v && v.is_active && v.inventory_quantity > 0;
        }

        assertTrue(isVariantSelectable('var_01')); // Active with 20 in stock
        assertFalse(isVariantSelectable('var_12')); // Inactive with 0 in stock
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
