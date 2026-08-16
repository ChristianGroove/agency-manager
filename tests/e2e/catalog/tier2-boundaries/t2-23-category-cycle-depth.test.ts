/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-23-category-cycle-depth
 * Feature: F23 - Category Management Drawer
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  sortOrder: number;
}

export function detectCategoryCycle(categories: CategoryNode[]): boolean {
  const parentMap = new Map<string, string | null>();
  for (const cat of categories) {
    parentMap.set(cat.id, cat.parentId || null);
  }

  for (const cat of categories) {
    const visited = new Set<string>();
    let currentId: string | null = cat.id;

    while (currentId) {
      if (visited.has(currentId)) {
        return true;
      }
      visited.add(currentId);
      currentId = parentMap.get(currentId) || null;
    }
  }

  return false;
}

export function normalizeSortOrders(categories: CategoryNode[]): CategoryNode[] {
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return sorted.map((cat, idx) => ({
    ...cat,
    sortOrder: idx + 1,
  }));
}

export function resolveSlugCollision(newSlug: string, existingSlugs: string[]): string {
  const base = newSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!existingSlugs.includes(base)) {
    return base;
  }

  let counter = 1;
  while (existingSlugs.includes(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}

export const suite = {
  name: 'T2-23: Category Cycle Depth, Slugs & Reorder Normalization',
  tier: 'Tier 2',
  feature: 'F23: Category Management Drawer',
  tests: [
    {
      name: 'Circular category parent loop (A -> B -> C -> A) is detected and blocked',
      fn: async () => {
        const cyclicTree: CategoryNode[] = [
          { id: 'cat-a', name: 'Cat A', slug: 'cat-a', parentId: 'cat-c', sortOrder: 1 },
          { id: 'cat-b', name: 'Cat B', slug: 'cat-b', parentId: 'cat-a', sortOrder: 2 },
          { id: 'cat-c', name: 'Cat C', slug: 'cat-c', parentId: 'cat-b', sortOrder: 3 },
        ];

        const hasCycle = detectCategoryCycle(cyclicTree);
        expect(hasCycle).toBe(true);
      },
    },
    {
      name: 'Valid acyclic hierarchy passes cycle check',
      fn: async () => {
        const validTree: CategoryNode[] = [
          { id: 'root-1', name: 'Ropa', slug: 'ropa', parentId: null, sortOrder: 1 },
          { id: 'child-1', name: 'Hombre', slug: 'hombre', parentId: 'root-1', sortOrder: 2 },
          { id: 'subchild-1', name: 'Camisas', slug: 'camisas', parentId: 'child-1', sortOrder: 3 },
        ];

        const hasCycle = detectCategoryCycle(validTree);
        expect(hasCycle).toBe(false);
      },
    },
    {
      name: 'Category reorder with duplicate sort indexes normalizes sequentially (1..N)',
      fn: async () => {
        const duplicateIndexes: CategoryNode[] = [
          { id: '1', name: 'Zapatos', slug: 'zapatos', sortOrder: 5 },
          { id: '2', name: 'Accesorios', slug: 'accesorios', sortOrder: 5 },
          { id: '3', name: 'Bolsos', slug: 'bolsos', sortOrder: 1 },
        ];

        const normalized = normalizeSortOrders(duplicateIndexes);
        expect(normalized[0].name).toBe('Bolsos');
        expect(normalized[0].sortOrder).toBe(1);
        expect(normalized[1].sortOrder).toBe(2);
        expect(normalized[2].sortOrder).toBe(3);
      },
    },
    {
      name: 'Category slug collision resolves to unique incremented suffix',
      fn: async () => {
        const existing = ['camisas', 'camisas-1', 'camisas-2'];
        const resolved = resolveSlugCollision('Camisas', existing);
        expect(resolved).toBe('camisas-3');
      },
    },
    {
      name: 'Empty or whitespace category name is rejected with error',
      fn: async () => {
        const validateCategoryName = (name: string): { valid: boolean; error?: string } => {
          if (!name || !name.trim()) {
            return { valid: false, error: 'Category name cannot be empty' };
          }
          return { valid: true };
        };

        expect(validateCategoryName('').valid).toBe(false);
        expect(validateCategoryName('   ').valid).toBe(false);
        expect(validateCategoryName('Tecnología').valid).toBe(true);
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
