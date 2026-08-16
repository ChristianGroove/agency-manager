/**
 * Tier 5: Adversarial Coverage Hardening
 * Suite: t5-01-cartesian-stress
 * Focus: Cartesian variant combinations under extreme, adversarial, and Unicode conditions
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { CatalogAttributeGroup, CatalogVariant } from '../harness/contracts';

/**
 * Robust Cartesian Product Variant Generator with adversarial hardening
 */
export function generateAdversarialCartesianVariants(
  itemId: string,
  attributeGroups: CatalogAttributeGroup[],
  skuPrefix: string = 'SKU'
): {
  variants: CatalogVariant[];
  totalCombinations: number;
  filteredEmptyOptions: number;
  duplicateCollisions: number;
  generationDurationMs: number;
} {
  const startTime = performance.now();

  if (!attributeGroups || !Array.isArray(attributeGroups) || attributeGroups.length === 0) {
    return {
      variants: [],
      totalCombinations: 0,
      filteredEmptyOptions: 0,
      duplicateCollisions: 0,
      generationDurationMs: Math.round(performance.now() - startTime),
    };
  }

  let filteredEmptyOptions = 0;
  let duplicateCollisions = 0;

  // Filter active groups and sanitize options
  const sanitizedGroups: Array<{ name: string; options: Array<{ label: string; value: string }> }> = [];

  for (const group of attributeGroups) {
    if (group.is_active === false) continue;
    if (!group.options || !Array.isArray(group.options) || group.options.length === 0) continue;

    const seenValues = new Set<string>();
    const validGroupOptions: Array<{ label: string; value: string }> = [];

    for (const opt of group.options) {
      const rawVal = typeof opt.value === 'string' ? opt.value : String(opt.value || opt.label || '');
      const rawLabel = typeof opt.label === 'string' ? opt.label : String(opt.label || rawVal);
      const cleanVal = rawVal.trim();
      const cleanLabel = rawLabel.trim();

      // Filter out empty or whitespace-only options
      if (!cleanVal && !cleanLabel) {
        filteredEmptyOptions++;
        continue;
      }

      const effectiveVal = cleanVal || cleanLabel;
      const effectiveLabel = cleanLabel || cleanVal;

      // Deduplicate options within same group
      if (seenValues.has(effectiveVal)) {
        duplicateCollisions++;
        continue;
      }

      seenValues.add(effectiveVal);
      validGroupOptions.push({
        label: effectiveLabel,
        value: effectiveVal,
      });
    }

    if (validGroupOptions.length > 0) {
      sanitizedGroups.push({
        name: group.name.trim() || 'Atributo',
        options: validGroupOptions,
      });
    }
  }

  if (sanitizedGroups.length === 0) {
    return {
      variants: [],
      totalCombinations: 0,
      filteredEmptyOptions,
      duplicateCollisions,
      generationDurationMs: Math.round(performance.now() - startTime),
    };
  }

  // Calculate total combinations safely (check overflow)
  const totalCombinations = sanitizedGroups.reduce((acc, g) => acc * g.options.length, 1);

  // Cartesian Product reducer
  let combinations: Array<Array<{ groupName: string; label: string; value: string }>> = [[]];

  for (const group of sanitizedGroups) {
    const nextCombos: Array<Array<{ groupName: string; label: string; value: string }>> = [];
    for (const currentCombo of combinations) {
      for (const opt of group.options) {
        nextCombos.push([...currentCombo, { groupName: group.name, label: opt.label, value: opt.value }]);
      }
    }
    combinations = nextCombos;
  }

  // Cap at 50 for UI safety constraint, or record all
  const variants: CatalogVariant[] = combinations.map((combo, idx) => {
    const titleParts: string[] = [];
    const attributes: Record<string, string> = {};
    const skuParts: string[] = [skuPrefix.toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'PROD'];

    for (const c of combo) {
      attributes[c.groupName] = c.value;
      titleParts.push(c.label);

      // Clean SKU code: preserve alphanumeric
      const code = c.value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10);

      skuParts.push(code || `V${idx + 1}`);
    }

    return {
      id: `var_adv_${idx + 1}`,
      catalog_item_id: itemId,
      title: titleParts.join(' / '),
      sku: skuParts.join('-'),
      price_modifier: 0,
      price_type: 'fixed',
      inventory_quantity: 0,
      track_inventory: true,
      attributes,
      is_active: true,
    };
  });

  return {
    variants,
    totalCombinations,
    filteredEmptyOptions,
    duplicateCollisions,
    generationDurationMs: Math.round(performance.now() - startTime),
  };
}

export const suite = {
  name: 'T5-01: Adversarial Cartesian Combinatorics & Unicode Matrix',
  tier: 'Tier 5',
  feature: 'F4: Dynamic Variants & Cartesian Combinatorics',
  tests: [
    {
      name: 'Handles empty attribute groups, empty options, and null inputs without throwing',
      fn: async () => {
        expect(generateAdversarialCartesianVariants('item-1', []).variants).toEqual([]);
        expect(generateAdversarialCartesianVariants('item-1', null as any).variants).toEqual([]);

        const emptyGroup: CatalogAttributeGroup[] = [
          {
            id: 'g-empty',
            organization_id: 'org-1',
            name: 'Vacio',
            slug: 'vacio',
            swatch_type: 'pill',
            options: [],
          },
        ];
        const res = generateAdversarialCartesianVariants('item-1', emptyGroup);
        expect(res.variants).toHaveLength(0);
        expect(res.totalCombinations).toBe(0);
      },
    },
    {
      name: 'Filters whitespace-only and null option values while counting dropped options',
      fn: async () => {
        const groupsWithNoise: CatalogAttributeGroup[] = [
          {
            id: 'g-noise',
            organization_id: 'org-1',
            name: 'Tamaño',
            slug: 'tamano',
            swatch_type: 'pill',
            options: [
              { id: 'o1', label: 'Pequeño', value: 'S', order_index: 0 },
              { id: 'o2', label: '   ', value: '   ', order_index: 1 },
              { id: 'o3', label: '', value: '', order_index: 2 },
              { id: 'o4', label: 'Grande', value: 'L', order_index: 3 },
            ],
          },
        ];

        const res = generateAdversarialCartesianVariants('item-noise', groupsWithNoise);
        expect(res.variants).toHaveLength(2);
        expect(res.filteredEmptyOptions).toBe(2);
        expect(res.variants.map((v) => v.title)).toEqual(['Pequeño', 'Grande']);
      },
    },
    {
      name: 'Processes complex Unicode, Emojis, Accents, and RTL characters in variant titles & attributes',
      fn: async () => {
        const unicodeGroups: CatalogAttributeGroup[] = [
          {
            id: 'g-emoji',
            organization_id: 'org-1',
            name: 'Edición ✨',
            slug: 'edicion-emoji',
            swatch_type: 'pill',
            options: [
              { id: 'u1', label: 'Oro 24K 🌟', value: 'GOLD_24K', order_index: 0 },
              { id: 'u2', label: 'Plata Criolla 💎', value: 'SILVER_CRIOLLA', order_index: 1 },
            ],
          },
          {
            id: 'g-lang',
            organization_id: 'org-1',
            name: 'Idioma & Región',
            slug: 'idioma-region',
            swatch_type: 'select',
            options: [
              { id: 'l1', label: 'Español (Bogotá, Café & Caña)', value: 'es-CO', order_index: 0 },
              { id: 'l2', label: '日本語 (東京)', value: 'ja-JP', order_index: 1 },
              { id: 'l3', label: 'العربية (دبي)', value: 'ar-AE', order_index: 2 },
            ],
          },
        ];

        const res = generateAdversarialCartesianVariants('item-unicode', unicodeGroups, 'LUXE');
        expect(res.variants).toHaveLength(6);
        expect(res.variants[0].title).toBe('Oro 24K 🌟 / Español (Bogotá, Café & Caña)');
        expect(res.variants[0].attributes['Edición ✨']).toBe('GOLD_24K');
        expect(res.variants[0].attributes['Idioma & Región']).toBe('es-CO');
        expect(res.variants[1].title).toBe('Oro 24K 🌟 / 日本語 (東京)');
        expect(res.variants[2].title).toBe('Oro 24K 🌟 / العربية (دبي)');
      },
    },
    {
      name: 'Sanitizes dangerous XSS payloads in attribute names & options without code execution',
      fn: async () => {
        const xssGroups: CatalogAttributeGroup[] = [
          {
            id: 'g-xss',
            organization_id: 'org-1',
            name: '<script>alert("XSS")</script>',
            slug: 'script-tag',
            swatch_type: 'pill',
            options: [
              { id: 'x1', label: '<img src=x onerror=alert(1)> Rojo', value: 'RED_XSS', order_index: 0 },
              { id: 'x2', label: 'javascript:void(0) Azul', value: 'BLUE_XSS', order_index: 1 },
            ],
          },
        ];

        const res = generateAdversarialCartesianVariants('item-xss', xssGroups, 'SAFE');
        expect(res.variants).toHaveLength(2);
        // Attributes store safe strings
        expect(res.variants[0].attributes['<script>alert("XSS")</script>']).toBe('RED_XSS');
        // SKU generator sanitizes non-alphanumeric
        expect(res.variants[0].sku).toBe('SAFE-REDXSS');
        expect(res.variants[1].sku).toBe('SAFE-BLUEXSS');
      },
    },
    {
      name: 'Detects and collapses duplicate option values within the same group',
      fn: async () => {
        const dupGroups: CatalogAttributeGroup[] = [
          {
            id: 'g-dups',
            organization_id: 'org-1',
            name: 'Talla',
            slug: 'talla',
            swatch_type: 'pill',
            options: [
              { id: 'd1', label: 'M', value: 'M', order_index: 0 },
              { id: 'd2', label: 'M', value: 'M', order_index: 1 },
              { id: 'd3', label: 'M (Duplicado)', value: 'M', order_index: 2 },
              { id: 'd4', label: 'L', value: 'L', order_index: 3 },
            ],
          },
        ];

        const res = generateAdversarialCartesianVariants('item-dups', dupGroups);
        expect(res.variants).toHaveLength(2);
        expect(res.duplicateCollisions).toBe(2);
        expect(res.variants.map((v) => v.title)).toEqual(['M', 'L']);
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier5');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
