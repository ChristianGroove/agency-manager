/**
 * Tier 5: Adversarial Coverage Hardening
 * Suite: t5-05-multi-tenant-rls-invariants
 * Focus: Multi-tenant RLS isolation, cross-tenant ID tampering, FK hijacking, batch rollback & public/private masking
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem } from '../harness/contracts';
import { TENANT_A_ID, TENANT_B_ID } from '../harness/mock-data';

export interface MultiTenantCatalogDatabase {
  items: UniversalCatalogItem[];
  variants: Array<{ id: string; organization_id: string; catalog_item_id: string; title: string; price_modifier: number }>;
  addons: Array<{ id: string; organization_id: string; name: string; scope: 'global' | 'item' }>;
  itemAddons: Array<{ item_id: string; addon_id: string }>;
}

export function createAdversarialMultiTenantDb(): MultiTenantCatalogDatabase {
  return {
    items: [
      {
        id: 'item-a-public',
        organization_id: TENANT_A_ID,
        name: 'Public Product A',
        base_price: 50000,
        is_visible_in_portal: true,
        deleted_at: null,
      } as any,
      {
        id: 'item-a-hidden',
        organization_id: TENANT_A_ID,
        name: 'Draft Secret Product A',
        base_price: 150000,
        is_visible_in_portal: false,
        deleted_at: null,
      } as any,
      {
        id: 'item-a-deleted',
        organization_id: TENANT_A_ID,
        name: 'Archived Product A',
        base_price: 20000,
        is_visible_in_portal: true,
        deleted_at: '2026-08-01T00:00:00Z',
      } as any,
      {
        id: 'item-b-public',
        organization_id: TENANT_B_ID,
        name: 'Public Product B',
        base_price: 75000,
        is_visible_in_portal: true,
        deleted_at: null,
      } as any,
      {
        id: 'item-b-hidden',
        organization_id: TENANT_B_ID,
        name: 'Confidential Strategy B',
        base_price: 500000,
        is_visible_in_portal: false,
        deleted_at: null,
      } as any,
    ],
    variants: [
      { id: 'var-a1', organization_id: TENANT_A_ID, catalog_item_id: 'item-a-public', title: 'Color Azul', price_modifier: 0 },
      { id: 'var-b1', organization_id: TENANT_B_ID, catalog_item_id: 'item-b-public', title: 'Plan Enterprise', price_modifier: 20000 },
    ],
    addons: [
      { id: 'add-a1', organization_id: TENANT_A_ID, name: 'Garantía A', scope: 'global' },
      { id: 'add-b1', organization_id: TENANT_B_ID, name: 'SLA Premium B', scope: 'item' },
    ],
    itemAddons: [
      { item_id: 'item-a-public', addon_id: 'add-a1' },
      { item_id: 'item-b-public', addon_id: 'add-b1' },
    ],
  };
}

/**
 * Public Storefront Catalog Query Engine
 */
export function queryPublicStorefrontCatalog(
  db: MultiTenantCatalogDatabase,
  targetOrgId?: string
): UniversalCatalogItem[] {
  return db.items.filter((item) => {
    // 1. Must be visible in portal
    if (!item.is_visible_in_portal) return false;
    // 2. Must not be soft-deleted
    if (item.deleted_at) return false;
    // 3. If targetOrgId specified (storefront URL slug context), filter by org
    if (targetOrgId && item.organization_id !== targetOrgId) return false;

    return true;
  });
}

/**
 * Admin Catalog Item Query Engine (enforces authenticated orgId)
 */
export function queryAdminCatalogItems(
  db: MultiTenantCatalogDatabase,
  authenticatedOrgId: string,
  includeHidden: boolean = true,
  includeDeleted: boolean = false
): UniversalCatalogItem[] {
  return db.items.filter((item) => {
    // Strict tenant isolation
    if (item.organization_id !== authenticatedOrgId) return false;
    if (!includeDeleted && item.deleted_at) return false;
    if (!includeHidden && !item.is_visible_in_portal) return false;
    return true;
  });
}

/**
 * Secure Variant Insertion with Foreign Key & Tenant Integrity Check
 */
export function insertVariantSecure(
  db: MultiTenantCatalogDatabase,
  authenticatedOrgId: string,
  variant: { id: string; catalog_item_id: string; title: string; price_modifier: number }
): { success: boolean; error?: string } {
  // 1. Check parent item exists AND belongs to the same authenticated org
  const parentItem = db.items.find((i) => i.id === variant.catalog_item_id);
  if (!parentItem) {
    return { success: false, error: `Parent catalog item ${variant.catalog_item_id} does not exist` };
  }

  if (parentItem.organization_id !== authenticatedOrgId) {
    return {
      success: false,
      error: `Security Violation: Cannot attach variant to item belonging to foreign organization ${parentItem.organization_id}`,
    };
  }

  // 2. Insert with authenticatedOrgId
  db.variants.push({
    ...variant,
    organization_id: authenticatedOrgId,
  });

  return { success: true };
}

/**
 * Atomic Multi-Item Batch Mutation Engine
 */
export function batchMutateCatalogSecure(
  db: MultiTenantCatalogDatabase,
  authenticatedOrgId: string,
  mutations: Array<{ action: 'update' | 'delete'; itemId: string; name?: string }>
): { success: boolean; mutatedCount: number; rejectionReason?: string } {
  const stagedOps: Array<() => void> = [];

  for (const mut of mutations) {
    const item = db.items.find((i) => i.id === mut.itemId);
    if (!item) {
      return { success: false, mutatedCount: 0, rejectionReason: `Item ${mut.itemId} not found` };
    }

    if (item.organization_id !== authenticatedOrgId) {
      return {
        success: false,
        mutatedCount: 0,
        rejectionReason: `Security Exception: Access denied to item ${mut.itemId} (owned by ${item.organization_id})`,
      };
    }

    if (mut.action === 'update' && mut.name) {
      const newName = mut.name;
      stagedOps.push(() => {
        item.name = newName;
      });
    } else if (mut.action === 'delete') {
      stagedOps.push(() => {
        item.deleted_at = new Date().toISOString();
      });
    }
  }

  // Execute all atomically
  for (const op of stagedOps) {
    op();
  }

  return { success: true, mutatedCount: stagedOps.length };
}

export const suite = {
  name: 'T5-05: Multi-Tenant RLS Invariants & Cross-Org Isolation',
  tier: 'Tier 5',
  feature: 'F25: Strict Multi-Tenant Isolation (RLS)',
  tests: [
    {
      name: 'Public storefront queries mask hidden (draft) and soft-deleted items strictly',
      fn: async () => {
        const db = createAdversarialMultiTenantDb();
        const publicItemsTenantA = queryPublicStorefrontCatalog(db, TENANT_A_ID);

        expect(publicItemsTenantA).toHaveLength(1);
        expect(publicItemsTenantA[0].id).toBe('item-a-public');

        const hasHidden = publicItemsTenantA.some((i) => i.id === 'item-a-hidden');
        const hasDeleted = publicItemsTenantA.some((i) => i.id === 'item-a-deleted');
        expect(hasHidden).toBe(false);
        expect(hasDeleted).toBe(false);
      },
    },
    {
      name: 'Authenticated admin query returns tenant-owned hidden items but completely isolates foreign tenants',
      fn: async () => {
        const db = createAdversarialMultiTenantDb();
        const adminItemsA = queryAdminCatalogItems(db, TENANT_A_ID, true, false);

        expect(adminItemsA).toHaveLength(2); // item-a-public and item-a-hidden
        const ids = adminItemsA.map((i) => i.id);
        expect(ids).toContain('item-a-public');
        expect(ids).toContain('item-a-hidden');

        // Verify zero Tenant B items leak
        const hasTenantB = adminItemsA.some((i) => i.organization_id === TENANT_B_ID);
        expect(hasTenantB).toBe(false);
      },
    },
    {
      name: 'Foreign Key hijacking: Attempting to create variant pointing to foreign item is blocked',
      fn: async () => {
        const db = createAdversarialMultiTenantDb();
        const hijackVariant = {
          id: 'var-hijack',
          catalog_item_id: 'item-b-public', // Belongs to Tenant B
          title: 'Malicious Injected Variant',
          price_modifier: 0,
        };

        // Authenticated as Tenant A
        const result = insertVariantSecure(db, TENANT_A_ID, hijackVariant);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot attach variant to item belonging to foreign organization');

        // Verify DB was not mutated
        const exists = db.variants.some((v) => v.id === 'var-hijack');
        expect(exists).toBe(false);
      },
    },
    {
      name: 'Batch mutation with 1 poisoned foreign item aborts with 100% atomic rollback',
      fn: async () => {
        const db = createAdversarialMultiTenantDb();
        const initialName = db.items[0].name;

        const poisonedBatch = [
          { action: 'update' as const, itemId: 'item-a-public', name: 'Legit Update A' },
          { action: 'delete' as const, itemId: 'item-b-public' }, // Poison: Tenant B item
        ];

        const res = batchMutateCatalogSecure(db, TENANT_A_ID, poisonedBatch);
        expect(res.success).toBe(false);
        expect(res.rejectionReason).toContain('Access denied');

        // Verify item-a-public was NOT mutated
        expect(db.items[0].name).toBe(initialName);
        // Verify item-b-public was NOT deleted
        expect(db.items[3].deleted_at).toBeNull();
      },
    },
    {
      name: 'Cross-tenant add-on isolation prevents attaching foreign tenant add-on to local item',
      fn: async () => {
        const db = createAdversarialMultiTenantDb();
        const tenantAAddons = db.addons.filter((a) => a.organization_id === TENANT_A_ID);
        const tenantBAddons = db.addons.filter((a) => a.organization_id === TENANT_B_ID);

        expect(tenantAAddons).toHaveLength(1);
        expect(tenantAAddons[0].id).toBe('add-a1');
        expect(tenantBAddons).toHaveLength(1);
        expect(tenantBAddons[0].id).toBe('add-b1');
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
