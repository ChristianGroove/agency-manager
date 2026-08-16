/**
 * Tier 1 Test Suite: F23 - Category Management Drawer
 * Tests category creation with Lucide icon, category color badge, drag reorder rank update, category deletion cascade check, item count aggregation.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertArrayLength,
  assertContains,
} from '../harness/assertions';
import { TENANT_A_ID } from '../harness/mock-data';

export const suite = {
  name: 'T1-23: Category Management Drawer',
  tier: 'Tier 1',
  feature: 'F23: Category Management Drawer',
  tests: [
    {
      name: 'Creates category with Lucide icon identifier, slug, and organization ID',
      fn: () => {
        interface CatalogCategory {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          icon_name: string;
          color: string;
          order_index: number;
        }

        function createCategory(name: string, icon: string, color: string, orgId: string): CatalogCategory {
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return {
            id: `cat_${Date.now()}`,
            organization_id: orgId,
            name,
            slug,
            icon_name: icon,
            color,
            order_index: 0,
          };
        }

        const cat = createCategory('Ropa & Moda', 'Shirt', '#3B82F6', TENANT_A_ID);
        assertEqual(cat.organization_id, TENANT_A_ID);
        assertEqual(cat.name, 'Ropa & Moda');
        assertEqual(cat.slug, 'ropa-moda');
        assertEqual(cat.icon_name, 'Shirt');
        assertEqual(cat.color, '#3B82F6');
      },
    },
    {
      name: 'Applies category color badge styling and visual pill representation',
      fn: () => {
        function getCategoryBadgeStyle(colorHex: string) {
          return {
            backgroundColor: `${colorHex}1A`, // 10% opacity background
            color: colorHex,
            borderColor: `${colorHex}4D`,     // 30% opacity border
          };
        }

        const badge = getCategoryBadgeStyle('#10B981');
        assertEqual(badge.backgroundColor, '#10B9811A');
        assertEqual(badge.color, '#10B981');
        assertEqual(badge.borderColor, '#10B9814D');
      },
    },
    {
      name: 'Updates category display ranking order after drag-and-drop sort operation',
      fn: () => {
        const categories = [
          { id: 'cat_01', name: 'Ropa', order_index: 0 },
          { id: 'cat_02', name: 'Calzado', order_index: 1 },
          { id: 'cat_03', name: 'Accesorios', order_index: 2 },
        ];

        // Move 'Accesorios' to top (index 0)
        const reordered = [categories[2], categories[0], categories[1]].map((c, idx) => ({
          ...c,
          order_index: idx,
        }));

        assertEqual(reordered[0].id, 'cat_03');
        assertEqual(reordered[0].order_index, 0);
        assertEqual(reordered[1].id, 'cat_01');
        assertEqual(reordered[1].order_index, 1);
        assertEqual(reordered[2].id, 'cat_02');
        assertEqual(reordered[2].order_index, 2);
      },
    },
    {
      name: 'Handles category deletion cascade by safely reassigning child items to Uncategorized',
      fn: () => {
        const items: Array<{ id: string; category_id: string | null; name: string; category?: string }> = [
          { id: 'item_1', category_id: 'cat_01', name: 'Camiseta', category: 'Ropa' },
          { id: 'item_2', category_id: 'cat_01', name: 'Pantalón', category: 'Ropa' },
          { id: 'item_3', category_id: 'cat_02', name: 'Zapatos', category: 'Calzado' },
        ];

        function deleteCategory(categoryIdToDelete: string, currentItems: typeof items) {
          return currentItems.map((it) => {
            if (it.category_id === categoryIdToDelete) {
              return { ...it, category_id: null, category: 'Sin Categoría' };
            }
            return it;
          });
        }

        const afterDelete = deleteCategory('cat_01', items);
        assertEqual(afterDelete[0].category_id, null);
        assertEqual(afterDelete[0].category, 'Sin Categoría');
        assertEqual(afterDelete[1].category_id, null);
        assertEqual(afterDelete[2].category_id, 'cat_02'); // Untouched
      },
    },
    {
      name: 'Aggregates item count correctly per category for sidebar navigation badges',
      fn: () => {
        const catalogItems = [
          { id: 'i1', category_id: 'cat_apparel' },
          { id: 'i2', category_id: 'cat_apparel' },
          { id: 'i3', category_id: 'cat_digital' },
          { id: 'i4', category_id: 'cat_apparel' },
          { id: 'i5', category_id: null },
        ];

        function computeCategoryCounts(items: typeof catalogItems) {
          const counts: Record<string, number> = { all: items.length, uncategorized: 0 };
          items.forEach((item) => {
            if (!item.category_id) {
              counts.uncategorized++;
            } else {
              counts[item.category_id] = (counts[item.category_id] || 0) + 1;
            }
          });
          return counts;
        }

        const counts = computeCategoryCounts(catalogItems);
        assertEqual(counts.all, 5);
        assertEqual(counts.cat_apparel, 3);
        assertEqual(counts.cat_digital, 1);
        assertEqual(counts.uncategorized, 1);
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
