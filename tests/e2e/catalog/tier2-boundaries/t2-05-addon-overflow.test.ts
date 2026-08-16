/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-05-addon-overflow
 * Feature: F5 - Dynamic Add-on & Upsell Engine
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { CatalogAddonGroup, CatalogAddonOption, calculateEffectiveTotalPrice } from '../harness/contracts';

export function validateAddonGroupSelection(
  group: CatalogAddonGroup,
  selectedOptionIds: string[]
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Group definition validation
  if (group.min_selections !== undefined && group.max_selections !== undefined) {
    if (group.min_selections > group.max_selections) {
      errors.push(`Invalid addon group configuration: min_selections (${group.min_selections}) cannot exceed max_selections (${group.max_selections})`);
    }
  }

  // Required check
  if (group.is_required && selectedOptionIds.length === 0) {
    errors.push(`Selection required for add-on group "${group.name}"`);
  }

  // Min selections check
  const minRequired = group.min_selections ?? (group.is_required ? 1 : 0);
  if (selectedOptionIds.length < minRequired) {
    errors.push(`Minimum selections for "${group.name}" is ${minRequired}, but received ${selectedOptionIds.length}`);
  }

  // Max selections check
  const maxAllowed = group.max_selections ?? (group.selection_type === 'single' ? 1 : group.options.length);
  if (selectedOptionIds.length > maxAllowed) {
    errors.push(`Maximum selections for "${group.name}" is ${maxAllowed}, but received ${selectedOptionIds.length}`);
  }

  // Validate all selectedOptionIds exist in group
  const validOptionIds = new Set(group.options.map((o) => o.id));
  for (const optId of selectedOptionIds) {
    if (!validOptionIds.has(optId)) {
      errors.push(`Option ID "${optId}" is not a valid option in group "${group.name}"`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export const suite = {
  name: 'T2-05: Add-on Overflow & Constraint Validation',
  tier: 'Tier 2',
  feature: 'F5: Dynamic Add-on & Upsell Engine',
  tests: [
    {
      name: 'min_selections > max_selections triggers configuration error',
      fn: async () => {
        const invalidGroup: CatalogAddonGroup = {
          id: 'grp-invalid',
          name: 'Toppings',
          selection_type: 'multiple',
          is_required: true,
          min_selections: 3,
          max_selections: 1,
          options: [
            { id: 't1', name: 'Queso', price_delta: 5000, is_default: false },
            { id: 't2', name: 'Tocineta', price_delta: 6000, is_default: false },
          ],
        };

        const result = validateAddonGroupSelection(invalidGroup, ['t1']);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('min_selections (3) cannot exceed max_selections (1)');
      },
    },
    {
      name: 'Selecting 0 options when group is required throws validation error',
      fn: async () => {
        const requiredGroup: CatalogAddonGroup = {
          id: 'grp-sauce',
          name: 'Salsa Principal',
          selection_type: 'single',
          is_required: true,
          options: [
            { id: 's1', name: 'BBQ', price_delta: 0, is_default: true },
            { id: 's2', name: 'Mostaza Miel', price_delta: 0, is_default: false },
          ],
        };

        const result = validateAddonGroupSelection(requiredGroup, []);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Selection required for add-on group "Salsa Principal"');
      },
    },
    {
      name: 'Selecting more options than max_selections is rejected',
      fn: async () => {
        const multiGroup: CatalogAddonGroup = {
          id: 'grp-beverages',
          name: 'Bebidas Adicionales (Máx 2)',
          selection_type: 'multiple',
          is_required: false,
          min_selections: 0,
          max_selections: 2,
          options: [
            { id: 'b1', name: 'Agua', price_delta: 3000, is_default: false },
            { id: 'b2', name: 'Gaseosa', price_delta: 4000, is_default: false },
            { id: 'b3', name: 'Jugo Natural', price_delta: 6000, is_default: false },
          ],
        };

        const result = validateAddonGroupSelection(multiGroup, ['b1', 'b2', 'b3']);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Maximum selections for "Bebidas Adicionales (Máx 2)" is 2, but received 3');
      },
    },
    {
      name: 'Negative addon price reduction cannot result in price below zero',
      fn: async () => {
        const baseItem = { base_price: 15000 };
        const negativeAddons = [{ priceDelta: -30000 }];

        const totalPrice = calculateEffectiveTotalPrice(baseItem, null, negativeAddons, 1);
        expect(totalPrice).toBe(0);
      },
    },
    {
      name: 'Handles 25+ addons in a single group with high performance',
      fn: async () => {
        const largeOptions: CatalogAddonOption[] = Array.from({ length: 25 }, (_, i) => ({
          id: `opt-extra-${i + 1}`,
          name: `Ingrediente Especial #${i + 1}`,
          price_delta: (i + 1) * 1000,
          is_default: i === 0,
        }));

        const largeGroup: CatalogAddonGroup = {
          id: 'grp-huge',
          name: '25+ Ingredientes Gourmet',
          selection_type: 'multiple',
          is_required: false,
          min_selections: 0,
          max_selections: 5,
          options: largeOptions,
        };

        const result = validateAddonGroupSelection(largeGroup, ['opt-extra-1', 'opt-extra-2', 'opt-extra-25']);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
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
