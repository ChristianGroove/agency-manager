/**
 * Tier 5: Adversarial Coverage Hardening
 * Suite: t5-03-addon-conflict-stress
 * Focus: Add-on & Upsell selection bounds, conflicting requirements, duplicate add-on IDs, and SKU suffix integrity
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { CatalogAddonGroup, generateDynamicSKU } from '../harness/contracts';

/**
 * Adversarial Add-on Selection Resolver with strict bounds & deduplication
 */
export function resolveAdversarialAddonSelections(
  groups: CatalogAddonGroup[],
  selectedPayloads: Array<{ groupId: string; optionId: string; quantity?: number }>
): {
  isValid: boolean;
  resolvedSelections: Array<{ groupId: string; optionId: string; name: string; priceDelta: number; quantity: number }>;
  totalDelta: number;
  errors: string[];
  deduplicatedIds: number;
} {
  const errors: string[] = [];
  const groupMap = new Map<string, CatalogAddonGroup>();
  for (const g of groups) {
    groupMap.set(g.id, g);
  }

  const seenOptionInGroup = new Map<string, Set<string>>();
  const selectionsPerGroup = new Map<string, Array<{ optionId: string; name: string; priceDelta: number; quantity: number }>>();
  let deduplicatedIds = 0;

  for (const sel of selectedPayloads) {
    const group = groupMap.get(sel.groupId);
    if (!group) {
      errors.push(`Grupo de adicionales no existe: ${sel.groupId}`);
      continue;
    }

    const opt = group.options.find((o) => o.id === sel.optionId);
    if (!opt) {
      errors.push(`Opción ${sel.optionId} no existe en el grupo ${group.name}`);
      continue;
    }

    let groupSeen = seenOptionInGroup.get(sel.groupId);
    if (!groupSeen) {
      groupSeen = new Set();
      seenOptionInGroup.set(sel.groupId, groupSeen);
    }

    if (groupSeen.has(sel.optionId)) {
      // Duplicate selection payload in same group
      deduplicatedIds++;
      // Increment quantity if already exists
      const existingList = selectionsPerGroup.get(sel.groupId) || [];
      const item = existingList.find((i) => i.optionId === sel.optionId);
      if (item) {
        item.quantity += Math.max(1, sel.quantity || 1);
      }
      continue;
    }

    groupSeen.add(sel.optionId);

    const list = selectionsPerGroup.get(sel.groupId) || [];
    list.push({
      optionId: opt.id,
      name: opt.name,
      priceDelta: Number(opt.price_delta || 0),
      quantity: Math.max(1, sel.quantity || 1),
    });
    selectionsPerGroup.set(sel.groupId, list);
  }

  // Validate group constraints (is_required, min_selections, max_selections, single vs multiple)
  for (const group of groups) {
    const list = selectionsPerGroup.get(group.id) || [];
    const count = list.length;

    if (group.is_required && count === 0) {
      errors.push(`Selección obligatoria para el grupo "${group.name}"`);
    }

    if (group.selection_type === 'single' && count > 1) {
      errors.push(`El grupo "${group.name}" solo permite seleccionar 1 opción`);
    }

    if (group.min_selections && count < group.min_selections) {
      errors.push(`El grupo "${group.name}" requiere al menos ${group.min_selections} selección(es)`);
    }

    if (group.max_selections && count > group.max_selections) {
      errors.push(`El grupo "${group.name}" excede el máximo de ${group.max_selections} opciones permitidas`);
    }
  }

  const resolvedSelections: Array<{ groupId: string; optionId: string; name: string; priceDelta: number; quantity: number }> = [];
  let totalDelta = 0;

  for (const [groupId, list] of selectionsPerGroup.entries()) {
    for (const item of list) {
      resolvedSelections.push({
        groupId,
        optionId: item.optionId,
        name: item.name,
        priceDelta: item.priceDelta,
        quantity: item.quantity,
      });
      totalDelta += item.priceDelta * item.quantity;
    }
  }

  return {
    isValid: errors.length === 0,
    resolvedSelections,
    totalDelta,
    errors,
    deduplicatedIds,
  };
}

export const suite = {
  name: 'T5-03: Add-on & Upsell Conflict & Boundary Resolution',
  tier: 'Tier 5',
  feature: 'F5: Dynamic Add-on & Upsell Engine',
  tests: [
    {
      name: 'Detects and collapses duplicate add-on option IDs in selection payload safely',
      fn: async () => {
        const groups: CatalogAddonGroup[] = [
          {
            id: 'grp-toppings',
            name: 'Toppings Extra',
            selection_type: 'multiple',
            is_required: false,
            options: [
              { id: 'top-1', name: 'Queso Doble Crema', price_delta: 4000, is_default: false },
              { id: 'top-2', name: 'Tocineta Ahumada', price_delta: 5000, is_default: false },
            ],
          },
        ];

        const payloadWithDuplicates = [
          { groupId: 'grp-toppings', optionId: 'top-1', quantity: 1 },
          { groupId: 'grp-toppings', optionId: 'top-1', quantity: 2 }, // duplicate
          { groupId: 'grp-toppings', optionId: 'top-2', quantity: 1 },
        ];

        const res = resolveAdversarialAddonSelections(groups, payloadWithDuplicates);
        expect(res.isValid).toBe(true);
        expect(res.deduplicatedIds).toBe(1);
        expect(res.resolvedSelections).toHaveLength(2);

        // top-1 quantity combined (1 + 2 = 3)
        const top1 = res.resolvedSelections.find((s) => s.optionId === 'top-1');
        expect(top1?.quantity).toBe(3);
        // Total delta = (4000 * 3) + (5000 * 1) = 17000
        expect(res.totalDelta).toBe(17000);
      },
    },
    {
      name: 'Enforces single-selection constraint when multiple options submitted for single-choice group',
      fn: async () => {
        const singleGroup: CatalogAddonGroup[] = [
          {
            id: 'grp-lic',
            name: 'Tipo de Licencia',
            selection_type: 'single',
            is_required: true,
            options: [
              { id: 'lic-1', name: 'Single User', price_delta: 0, is_default: true },
              { id: 'lic-2', name: 'Team (5 Seats)', price_delta: 50000, is_default: false },
            ],
          },
        ];

        const invalidPayload = [
          { groupId: 'grp-lic', optionId: 'lic-1' },
          { groupId: 'grp-lic', optionId: 'lic-2' },
        ];

        const res = resolveAdversarialAddonSelections(singleGroup, invalidPayload);
        expect(res.isValid).toBe(false);
        expect(res.errors[0]).toContain('solo permite seleccionar 1 opción');
      },
    },
    {
      name: 'Validates required group minimum selections when empty payload submitted',
      fn: async () => {
        const requiredGroup: CatalogAddonGroup[] = [
          {
            id: 'grp-mand',
            name: 'Base Obligatoria',
            selection_type: 'single',
            is_required: true,
            options: [{ id: 'opt-base', name: 'Estándar', price_delta: 0, is_default: true }],
          },
        ];

        const res = resolveAdversarialAddonSelections(requiredGroup, []);
        expect(res.isValid).toBe(false);
        expect(res.errors[0]).toContain('Selección obligatoria');
      },
    },
    {
      name: 'Dynamic SKU suffix generation cleans leading dashes and handles special characters',
      fn: async () => {
        const addons = [
          { skuSuffix: '-EXT-WARRANTY' },
          { skuSuffix: 'GIFT-BOX' },
          { skuSuffix: '---RUSH-DELIVERY--' },
        ];

        const sku = generateDynamicSKU('PROD-LAPTOP', 'PROD-LAPTOP-M1', addons);
        expect(sku).toBe('PROD-LAPTOP-M1-EXT-WARRANTY-GIFT-BOX-RUSH-DELIVERY--');
      },
    },
    {
      name: 'Supports zero-delta and negative discount addons without breaking total calculations',
      fn: async () => {
        const groups: CatalogAddonGroup[] = [
          {
            id: 'grp-options',
            name: 'Configuración Adicional',
            selection_type: 'multiple',
            is_required: false,
            options: [
              { id: 'o-inc', name: 'Soporte Estándar', price_delta: 0, is_default: true },
              { id: 'o-disc', name: 'Sin Empaque (-$2.000)', price_delta: -2000, is_default: false },
            ],
          },
        ];

        const payload = [
          { groupId: 'grp-options', optionId: 'o-inc' },
          { groupId: 'grp-options', optionId: 'o-disc' },
        ];

        const res = resolveAdversarialAddonSelections(groups, payload);
        expect(res.isValid).toBe(true);
        expect(res.totalDelta).toBe(-2000);
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
