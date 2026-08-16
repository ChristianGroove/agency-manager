/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-12-badges-max-clash
 * Feature: F12 - Dynamic Status Badges
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { evaluateDynamicBadges, UniversalCatalogItem } from '../harness/contracts';

export const suite = {
  name: 'T2-12: Badges Max Limits & Clash Resolution',
  tier: 'Tier 2',
  feature: 'F12: Dynamic Status Badges',
  tests: [
    {
      name: 'Item qualifying for 5+ badges strictly prioritizes and caps at top 3 badges',
      fn: async () => {
        const item: UniversalCatalogItem = {
          id: 'badge-test-1',
          organization_id: 'org-1',
          name: 'Item with Many Badges',
          base_price: 80000,
          compare_at_price: 100000,
          type: 'product',
          classification: 'physical',
          gallery_images: [],
          inventory_quantity: 0,
          track_inventory: true,
          allow_backorders: false,
          low_stock_threshold: 5,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: ['Destacado', 'Novedad', 'Edición Limitada', 'Envío Gratis'],
          specifications: {},
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-01T00:00:00Z',
        };

        const badges = evaluateDynamicBadges(item);
        expect(badges.length).toBeLessThanOrEqual(3);
        expect(badges).toHaveLength(3);
        expect(badges[0]).toBe('Agotado');
        expect(badges[1]).toBe('-20% Descuento');
        expect(badges[2]).toBe('Destacado');
      },
    },
    {
      name: 'Conflicting badges "Agotado" vs "Pocas Unidades" suppresses "Pocas Unidades"',
      fn: async () => {
        const outOfStockItem: UniversalCatalogItem = {
          id: 'badge-test-2',
          organization_id: 'org-1',
          name: 'Out of Stock Product',
          base_price: 50000,
          type: 'product',
          classification: 'physical',
          gallery_images: [],
          inventory_quantity: 0,
          track_inventory: true,
          allow_backorders: false,
          low_stock_threshold: 5,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: ['Pocas Unidades', 'Destacado'],
          specifications: {},
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-01T00:00:00Z',
        };

        const badges = evaluateDynamicBadges(outOfStockItem);
        expect(badges).toContain('Agotado');
        expect(badges).not.toContain('Pocas Unidades');
      },
    },
    {
      name: 'Custom badge with 120 characters is clamped to 100 characters',
      fn: async () => {
        const longBadgeText = 'A'.repeat(120);
        const item: UniversalCatalogItem = {
          id: 'badge-test-3',
          organization_id: 'org-1',
          name: 'Long Badge Item',
          base_price: 50000,
          type: 'product',
          classification: 'physical',
          gallery_images: [],
          inventory_quantity: 100,
          track_inventory: false,
          allow_backorders: true,
          low_stock_threshold: 5,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: [longBadgeText],
          specifications: {},
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-01T00:00:00Z',
        };

        const badges = evaluateDynamicBadges(item);
        expect(badges).toHaveLength(1);
        expect(badges[0].length).toBe(100);
      },
    },
    {
      name: 'Empty badge array returns empty list when no dynamic rules apply',
      fn: async () => {
        const plainItem: UniversalCatalogItem = {
          id: 'badge-test-4',
          organization_id: 'org-1',
          name: 'Plain Item',
          base_price: 50000,
          type: 'product',
          classification: 'physical',
          gallery_images: [],
          inventory_quantity: 100,
          track_inventory: false,
          allow_backorders: true,
          low_stock_threshold: 5,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: [],
          specifications: {},
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-01T00:00:00Z',
        };

        const badges = evaluateDynamicBadges(plainItem);
        expect(badges).toHaveLength(0);
      },
    },
    {
      name: 'Special characters and emoji in badge text render cleanly',
      fn: async () => {
        const emojiItem: UniversalCatalogItem = {
          id: 'badge-test-5',
          organization_id: 'org-1',
          name: 'Emoji Badge Item',
          base_price: 50000,
          type: 'product',
          classification: 'physical',
          gallery_images: [],
          inventory_quantity: 100,
          track_inventory: false,
          allow_backorders: true,
          low_stock_threshold: 5,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: ['⚡ 50% OFF Flash', '🌟 Best Seller 2026'],
          specifications: {},
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-01T00:00:00Z',
        };

        const badges = evaluateDynamicBadges(emojiItem);
        expect(badges).toContain('⚡ 50% OFF Flash');
        expect(badges).toContain('🌟 Best Seller 2026');
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
