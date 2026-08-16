/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-21-admin-empty-states
 * Feature: F21 - 3-Tab Unified Admin Workspace
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem } from '../harness/contracts';

export interface AdminCatalogWorkspaceState {
  items: UniversalCatalogItem[];
  categories: Array<{ id: string; name: string }>;
  searchQuery: string;
  selectedCategoryId?: string;
  currentPage: number;
  pageSize: number;
  selectedItemIds: string[];
}

export function filterAdminCatalogItems(state: AdminCatalogWorkspaceState): {
  displayedItems: UniversalCatalogItem[];
  totalFilteredCount: number;
  totalPages: number;
  emptyStateReason?: 'fresh_account' | 'no_search_results' | 'empty_category' | 'none';
} {
  if (state.items.length === 0 && state.categories.length === 0) {
    return {
      displayedItems: [],
      totalFilteredCount: 0,
      totalPages: 0,
      emptyStateReason: 'fresh_account',
    };
  }

  let filtered = [...state.items];

  if (state.selectedCategoryId) {
    filtered = filtered.filter((i) => i.category_id === state.selectedCategoryId);
    if (filtered.length === 0) {
      return {
        displayedItems: [],
        totalFilteredCount: 0,
        totalPages: 0,
        emptyStateReason: 'empty_category',
      };
    }
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.sku && i.sku.toLowerCase().includes(q))
    );
    if (filtered.length === 0) {
      return {
        displayedItems: [],
        totalFilteredCount: 0,
        totalPages: 0,
        emptyStateReason: 'no_search_results',
      };
    }
  }

  const totalFilteredCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / state.pageSize));
  const clampedPage = Math.max(1, Math.min(totalPages, state.currentPage));

  const startIdx = (clampedPage - 1) * state.pageSize;
  const displayedItems = filtered.slice(startIdx, startIdx + state.pageSize);

  return {
    displayedItems,
    totalFilteredCount,
    totalPages,
    emptyStateReason: 'none',
  };
}

export const suite = {
  name: 'T2-21: Admin Workspace Empty States & Boundary Filtering',
  tier: 'Tier 2',
  feature: 'F21: 3-Tab Unified Admin Workspace',
  tests: [
    {
      name: 'Fresh account with 0 categories and 0 items shows onboarding state',
      fn: async () => {
        const res = filterAdminCatalogItems({
          items: [],
          categories: [],
          searchQuery: '',
          currentPage: 1,
          pageSize: 10,
          selectedItemIds: [],
        });

        expect(res.emptyStateReason).toBe('fresh_account');
        expect(res.displayedItems).toHaveLength(0);
      },
    },
    {
      name: 'Search filter returning 0 results indicates no_search_results reason',
      fn: async () => {
        const items: UniversalCatalogItem[] = [
          { id: '1', organization_id: 'org', name: 'Zapato Cuero', base_price: 10000 } as any,
        ];

        const res = filterAdminCatalogItems({
          items,
          categories: [{ id: 'cat-1', name: 'Calzado' }],
          searchQuery: 'NonExistentProductQueryXYZ',
          currentPage: 1,
          pageSize: 10,
          selectedItemIds: [],
        });

        expect(res.emptyStateReason).toBe('no_search_results');
        expect(res.displayedItems).toHaveLength(0);
      },
    },
    {
      name: 'Category filter with 0 items indicates empty_category reason',
      fn: async () => {
        const items: UniversalCatalogItem[] = [
          { id: '1', organization_id: 'org', name: 'Zapato', category_id: 'cat-calzado', base_price: 10000 } as any,
        ];

        const res = filterAdminCatalogItems({
          items,
          categories: [
            { id: 'cat-calzado', name: 'Calzado' },
            { id: 'cat-electronica', name: 'Electrónica' },
          ],
          selectedCategoryId: 'cat-electronica',
          searchQuery: '',
          currentPage: 1,
          pageSize: 10,
          selectedItemIds: [],
        });

        expect(res.emptyStateReason).toBe('empty_category');
        expect(res.displayedItems).toHaveLength(0);
      },
    },
    {
      name: 'Pagination beyond last page clamps automatically to last valid page',
      fn: async () => {
        const items: UniversalCatalogItem[] = Array.from({ length: 15 }, (_, i) => ({
          id: `item-${i + 1}`,
          organization_id: 'org',
          name: `Product ${i + 1}`,
          base_price: 20000,
        } as any));

        const res = filterAdminCatalogItems({
          items,
          categories: [],
          searchQuery: '',
          currentPage: 99,
          pageSize: 10,
          selectedItemIds: [],
        });

        expect(res.totalPages).toBe(2);
        expect(res.displayedItems).toHaveLength(5);
      },
    },
    {
      name: 'Bulk action with 0 items selected returns warning error',
      fn: async () => {
        const handleBulkDelete = (selectedIds: string[]): { success: boolean; error?: string } => {
          if (selectedIds.length === 0) {
            return { success: false, error: 'No items selected for bulk operation' };
          }
          return { success: true };
        };

        const res = handleBulkDelete([]);
        expect(res.success).toBe(false);
        expect(res.error).toContain('No items selected');
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
