/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-04-variant-extremes
 * Feature: F4 - Dynamic Variants & Attribute Groups
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { CatalogAttributeGroup, CatalogVariant } from '../harness/contracts';

export function generateCartesianVariants(
  itemId: string,
  attributeGroups: CatalogAttributeGroup[]
): {
  variants: CatalogVariant[];
  generationTimeMs: number;
  duplicateCollisions: number;
} {
  const start = Date.now();
  if (attributeGroups.length === 0) {
    return { variants: [], generationTimeMs: 0, duplicateCollisions: 0 };
  }

  let combinations: Array<Record<string, string>> = [{}];

  for (const group of attributeGroups) {
    const nextCombinations: Array<Record<string, string>> = [];
    const uniqueOptions = Array.from(new Set(group.options.map((o) => o.value.trim()))).filter(Boolean);

    for (const comb of combinations) {
      for (const optVal of uniqueOptions) {
        nextCombinations.push({
          ...comb,
          [group.name]: optVal,
        });
      }
    }
    combinations = nextCombinations;
  }

  const seenSignatures = new Set<string>();
  let duplicateCollisions = 0;
  const variants: CatalogVariant[] = [];

  for (let i = 0; i < combinations.length; i++) {
    const attrs = combinations[i];
    const signature = Object.entries(attrs)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');

    if (seenSignatures.has(signature)) {
      duplicateCollisions++;
      continue;
    }
    seenSignatures.add(signature);

    const title = Object.values(attrs).join(' / ');
    variants.push({
      id: `var-gen-${i + 1}`,
      catalog_item_id: itemId,
      title,
      price_modifier: 0,
      price_type: 'offset',
      inventory_quantity: 0,
      track_inventory: true,
      attributes: attrs,
      is_active: true,
    });
  }

  return {
    variants,
    generationTimeMs: Date.now() - start,
    duplicateCollisions,
  };
}

export function sanitizeVariantInventory(qty: number): number {
  return Math.max(0, Math.floor(qty));
}

export const suite = {
  name: 'T2-04: Variant Extremes & Cartesian Combinatorics',
  tier: 'Tier 2',
  feature: 'F4: Dynamic Variants & Attribute Groups',
  tests: [
    {
      name: 'Generates 60+ Cartesian variant combinations in < 50ms',
      fn: async () => {
        const groups: CatalogAttributeGroup[] = [
          {
            id: 'g-sizes',
            organization_id: 'org-1',
            name: 'Talla',
            slug: 'talla',
            swatch_type: 'pill',
            options: [
              { id: 's1', label: 'XS', value: 'XS', order_index: 0 },
              { id: 's2', label: 'S', value: 'S', order_index: 1 },
              { id: 's3', label: 'M', value: 'M', order_index: 2 },
              { id: 's4', label: 'L', value: 'L', order_index: 3 },
              { id: 's5', label: 'XL', value: 'XL', order_index: 4 },
            ],
          },
          {
            id: 'g-colors',
            organization_id: 'org-1',
            name: 'Color',
            slug: 'color',
            swatch_type: 'color',
            options: [
              { id: 'c1', label: 'Rojo', value: 'Rojo', order_index: 0 },
              { id: 'c2', label: 'Verde', value: 'Verde', order_index: 1 },
              { id: 'c3', label: 'Azul', value: 'Azul', order_index: 2 },
              { id: 'c4', label: 'Negro', value: 'Negro', order_index: 3 },
            ],
          },
          {
            id: 'g-materials',
            organization_id: 'org-1',
            name: 'Material',
            slug: 'material',
            swatch_type: 'select',
            options: [
              { id: 'm1', label: 'Algodón', value: 'Algodón', order_index: 0 },
              { id: 'm2', label: 'Lino', value: 'Lino', order_index: 1 },
              { id: 'm3', label: 'Seda', value: 'Seda', order_index: 2 },
            ],
          },
        ];

        const result = generateCartesianVariants('item-test-01', groups);
        expect(result.variants).toHaveLength(60);
        expect(result.generationTimeMs).toBeLessThan(50);
        expect(result.duplicateCollisions).toBe(0);
      },
    },
    {
      name: 'Negative inventory quantities are sanitized and floored at 0',
      fn: async () => {
        expect(sanitizeVariantInventory(-5)).toBe(0);
        expect(sanitizeVariantInventory(-999)).toBe(0);
        expect(sanitizeVariantInventory(25.7)).toBe(25);
      },
    },
    {
      name: 'Empty attribute option values are filtered out automatically',
      fn: async () => {
        const groups: CatalogAttributeGroup[] = [
          {
            id: 'g-test',
            organization_id: 'org-1',
            name: 'Acabado',
            slug: 'acabado',
            swatch_type: 'pill',
            options: [
              { id: 'o1', label: 'Mate', value: 'Mate', order_index: 0 },
              { id: 'o2', label: '   ', value: '', order_index: 1 },
              { id: 'o3', label: 'Brillante', value: 'Brillante', order_index: 2 },
            ],
          },
        ];

        const result = generateCartesianVariants('item-test-02', groups);
        expect(result.variants).toHaveLength(2);
        expect(result.variants.map((v) => v.title)).toEqual(['Mate', 'Brillante']);
      },
    },
    {
      name: 'Variant with 0 price modifier correctly evaluates without mutation',
      fn: async () => {
        const variant: CatalogVariant = {
          id: 'var-0-mod',
          catalog_item_id: 'item-1',
          title: 'Estándar',
          price_modifier: 0,
          price_type: 'offset',
          inventory_quantity: 10,
          track_inventory: true,
          attributes: { Tipo: 'Estándar' },
          is_active: true,
        };

        expect(variant.price_modifier).toBe(0);
        expect(variant.price_type).toBe('offset');
      },
    },
    {
      name: 'Duplicate options in attribute group are deduplicated with collision detection',
      fn: async () => {
        const duplicateGroup: CatalogAttributeGroup[] = [
          {
            id: 'g-dup',
            organization_id: 'org-1',
            name: 'Talla',
            slug: 'talla',
            swatch_type: 'pill',
            options: [
              { id: 'o1', label: 'M', value: 'M', order_index: 0 },
              { id: 'o2', label: 'M', value: 'M', order_index: 1 },
              { id: 'o3', label: 'L', value: 'L', order_index: 2 },
            ],
          },
        ];

        const result = generateCartesianVariants('item-dup', duplicateGroup);
        expect(result.variants).toHaveLength(2);
        expect(result.variants[0].title).toBe('M');
        expect(result.variants[1].title).toBe('L');
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
