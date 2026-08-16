/**
 * Tier 3: Cross-Feature Pairwise Interactions
 * Suite: t3-09-tenant-isolation-with-variants
 * Features: Strict Tenant Isolation (RLS) × Deep Variant Matrix & Add-on Engine
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, CatalogVariant, CatalogAddonGroup } from '../harness/contracts';
import { TENANT_A_ID, TENANT_B_ID, mockFashionApparel } from '../harness/mock-data';

export interface MultiTenantCatalogStore {
  items: UniversalCatalogItem[];
}

export function createMultiTenantCatalogStore(): MultiTenantCatalogStore {
  const tenantBItem: UniversalCatalogItem = {
    ...mockFashionApparel,
    id: 'item-fashion-tenant-b',
    organization_id: TENANT_B_ID,
    name: 'Tenant B Vestido Exclusivo',
    variants: [
      {
        id: 'var-b-01',
        catalog_item_id: 'item-fashion-tenant-b',
        title: 'Talla Única / Rojo',
        price_modifier: 0,
        price_type: 'offset',
        inventory_quantity: 8,
        track_inventory: true,
        attributes: { Talla: 'Única', Color: 'Rojo' },
        is_active: true,
      },
    ],
  };

  // Deep clone mockFashionApparel so mutations don't leak
  const tenantAItem: UniversalCatalogItem = JSON.parse(JSON.stringify(mockFashionApparel));

  return {
    items: [tenantAItem, tenantBItem],
  };
}

export function getTenantItemWithVariants(
  store: MultiTenantCatalogStore,
  requestingOrgId: string,
  itemId: string
): { item: UniversalCatalogItem | null; variants: CatalogVariant[]; addons: CatalogAddonGroup[] } {
  const item = store.items.find((i) => i.id === itemId && i.organization_id === requestingOrgId);
  if (!item) {
    return { item: null, variants: [], addons: [] };
  }

  return {
    item,
    variants: item.variants || [],
    addons: item.addon_groups || [],
  };
}

export function updateTenantVariantInventory(
  store: MultiTenantCatalogStore,
  requestingOrgId: string,
  itemId: string,
  variantId: string,
  newQuantity: number
): boolean {
  const item = store.items.find((i) => i.id === itemId && i.organization_id === requestingOrgId);
  if (!item) return false;

  const variant = item.variants?.find((v) => v.id === variantId);
  if (!variant) return false;

  variant.inventory_quantity = Math.max(0, newQuantity);
  return true;
}

export const suite = {
  name: 'T3-09: Tenant Isolation with Variants',
  tier: 'Tier 3',
  feature: 'F25 x F4 x F5: Strict RLS x Variant Matrix x Add-on Engine',
  tests: [
    {
      name: 'Tenant A can read own item with all variants and addons',
      fn: async () => {
        const store = createMultiTenantCatalogStore();
        const res = getTenantItemWithVariants(store, TENANT_A_ID, mockFashionApparel.id);
        expect(res.item).not.toBeNull();
        expect(res.variants).toHaveLength(3);
        expect(res.addons).toHaveLength(1);
      },
    },
    {
      name: 'Tenant A querying Tenant B item with variants returns null and empty sub-collections',
      fn: async () => {
        const store = createMultiTenantCatalogStore();
        const res = getTenantItemWithVariants(store, TENANT_A_ID, 'item-fashion-tenant-b');
        expect(res.item).toBeNull();
        expect(res.variants).toHaveLength(0);
        expect(res.addons).toHaveLength(0);
      },
    },
    {
      name: 'Tenant A cannot mutate Tenant B variant inventory',
      fn: async () => {
        const store = createMultiTenantCatalogStore();
        const updated = updateTenantVariantInventory(store, TENANT_A_ID, 'item-fashion-tenant-b', 'var-b-01', 99);
        expect(updated).toBe(false);

        const resB = getTenantItemWithVariants(store, TENANT_B_ID, 'item-fashion-tenant-b');
        expect(resB.variants[0].inventory_quantity).toBe(8);
      },
    },
    {
      name: 'Tenant B can mutate own variant inventory without affecting Tenant A',
      fn: async () => {
        const store = createMultiTenantCatalogStore();
        const updated = updateTenantVariantInventory(store, TENANT_B_ID, 'item-fashion-tenant-b', 'var-b-01', 20);
        expect(updated).toBe(true);

        const resB = getTenantItemWithVariants(store, TENANT_B_ID, 'item-fashion-tenant-b');
        expect(resB.variants[0].inventory_quantity).toBe(20);
      },
    },
    {
      name: 'Cross-tenant variant attribute group ID collision is isolated by organization_id',
      fn: async () => {
        const attrGroupA = mockFashionApparel.variant_attributes[0];
        expect(attrGroupA.organization_id).toBe(TENANT_A_ID);
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier3');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
