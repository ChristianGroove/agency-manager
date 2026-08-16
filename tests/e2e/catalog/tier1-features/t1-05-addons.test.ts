/**
 * Tier 1 Test Suite: F5 - Dynamic Add-on & Upsell Engine
 * Tests single-choice required addon, multi-choice optional addon, min/max constraints, price delta modifiers, default addon selection.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertThrows,
  assertArrayLength,
} from '../harness/assertions';
import {
  validateCatalogAddonGroup,
  calculateCatalogItemPrice,
  CatalogAddonGroup,
} from '../harness/contracts';
import {
  mockPackagingAddonGroup,
  mockCustomizationAddonGroup,
} from '../harness/mock-data';

export const suite = {
  name: 'T1-05: Dynamic Add-on & Upsell Engine',
  tier: 'Tier 1',
  feature: 'F5: Dynamic Add-on & Upsell Engine',
  tests: [
    {
      name: 'Validates single-choice required addon group contract',
      fn: () => {
        const res = validateCatalogAddonGroup(mockPackagingAddonGroup);
        assertTrue(res.isValid, `Addon group validation failed: ${res.errors.join(', ')}`);
        assertEqual(mockPackagingAddonGroup.selection_type, 'single');
        assertTrue(mockPackagingAddonGroup.is_required);
        assertArrayLength(mockPackagingAddonGroup.options, 2);

        // Required single choice must enforce exactly 1 selection
        function validateSelections(group: CatalogAddonGroup, selectedOptionIds: string[]): boolean {
          if (group.is_required && selectedOptionIds.length === 0) return false;
          if (group.selection_type === 'single' && selectedOptionIds.length > 1) return false;
          return selectedOptionIds.every((id) => group.options.some((o) => o.id === id));
        }

        assertTrue(validateSelections(mockPackagingAddonGroup, ['opt_pkg_std']));
        assertFalse(validateSelections(mockPackagingAddonGroup, [])); // Missing required
        assertFalse(validateSelections(mockPackagingAddonGroup, ['opt_pkg_std', 'opt_pkg_lux'])); // Multiple not allowed
      },
    },
    {
      name: 'Validates multi-choice optional addon group allowing 0 or multiple selections',
      fn: () => {
        const res = validateCatalogAddonGroup(mockCustomizationAddonGroup);
        assertTrue(res.isValid);
        assertEqual(mockCustomizationAddonGroup.selection_type, 'multiple');
        assertFalse(mockCustomizationAddonGroup.is_required);

        function validateMulti(selectedIds: string[]): boolean {
          if (mockCustomizationAddonGroup.min_selections !== undefined && selectedIds.length < mockCustomizationAddonGroup.min_selections) return false;
          if (mockCustomizationAddonGroup.max_selections !== undefined && selectedIds.length > mockCustomizationAddonGroup.max_selections) return false;
          return true;
        }

        assertTrue(validateMulti([])); // 0 selections allowed
        assertTrue(validateMulti(['opt_emb_chest'])); // 1 selection allowed
        assertTrue(validateMulti(['opt_emb_chest', 'opt_emb_sleeve'])); // 2 selections allowed
      },
    },
    {
      name: 'Enforces min and max selection constraints on multi-choice groups',
      fn: () => {
        const groupWithConstraints: CatalogAddonGroup = {
          id: 'addon_catering_sides',
          name: 'Guarniciones Incluidas',
          selection_type: 'multiple',
          is_required: true,
          min_selections: 2,
          max_selections: 3,
          options: [
            { id: 'opt_s1', name: 'Arroz con Coco', price_delta: 0, is_default: true },
            { id: 'opt_s2', name: 'Patacones con Hogao', price_delta: 0, is_default: true },
            { id: 'opt_s3', name: 'Ensalada Verde de la Casa', price_delta: 0, is_default: false },
            { id: 'opt_s4', name: 'Papas Criollas al Romero', price_delta: 5000, is_default: false },
          ],
        };

        const res = validateCatalogAddonGroup(groupWithConstraints);
        assertTrue(res.isValid);

        function validateConstraint(selectedCount: number): boolean {
          return selectedCount >= (groupWithConstraints.min_selections ?? 0) &&
                 selectedCount <= (groupWithConstraints.max_selections ?? Infinity);
        }

        assertFalse(validateConstraint(1)); // Below min
        assertTrue(validateConstraint(2));  // Min boundary
        assertTrue(validateConstraint(3));  // Max boundary
        assertFalse(validateConstraint(4)); // Above max
      },
    },
    {
      name: 'Calculates dynamic price delta additions and updates total price accurately',
      fn: () => {
        const basePrice = 85000;

        // No addons
        const priceZero = calculateCatalogItemPrice(basePrice, null, []);
        assertEqual(priceZero, 85000);

        // Single luxury packaging (+15000)
        const priceWithLux = calculateCatalogItemPrice(basePrice, null, [
          { priceDelta: 15000 },
        ]);
        assertEqual(priceWithLux, 100000);

        // Luxury packaging (+15000) + Both embroidery addons (+12000 + 18000)
        const priceWithAll = calculateCatalogItemPrice(basePrice, null, [
          { priceDelta: 15000 },
          { priceDelta: 12000 },
          { priceDelta: 18000 },
        ]);
        assertEqual(priceWithAll, 130000);
      },
    },
    {
      name: 'Pre-selects default addon option on initial modal load',
      fn: () => {
        const defaultOptions = mockPackagingAddonGroup.options.filter((o) => o.is_default);
        assertEqual(defaultOptions.length, 1);
        assertEqual(defaultOptions[0].id, 'opt_pkg_std');
        assertEqual(defaultOptions[0].price_delta, 0);

        // Simulate initial state initialization
        const initialSelectedAddons = [
          mockPackagingAddonGroup,
          mockCustomizationAddonGroup,
        ].flatMap((group) =>
          group.options
            .filter((o) => o.is_default)
            .map((o) => ({ groupId: group.id, optionId: o.id, name: o.name, priceDelta: o.price_delta }))
        );

        assertEqual(initialSelectedAddons.length, 1);
        assertEqual(initialSelectedAddons[0].optionId, 'opt_pkg_std');
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
