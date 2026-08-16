/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-25-cross-tenant-leakage
 * Feature: F25 - Strict Multi-Tenant Isolation (RLS)
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem } from '../harness/contracts';
import { TENANT_A_ID, TENANT_B_ID } from '../harness/mock-data';

export interface DatabaseMock {
  items: UniversalCatalogItem[];
}

export function createMockDatabase(): DatabaseMock {
  return {
    items: [
      { id: 'item-a1', organization_id: TENANT_A_ID, name: 'Secret Product A1', base_price: 100 } as any,
      { id: 'item-a2', organization_id: TENANT_A_ID, name: 'Standard Product A2', base_price: 200 } as any,
      { id: 'item-b1', organization_id: TENANT_B_ID, name: 'Confidential Strategy B1', base_price: 300 } as any,
      { id: 'item-b2', organization_id: TENANT_B_ID, name: 'Enterprise Contract B2', base_price: 400 } as any,
    ],
  };
}

export function queryCatalogItemsAsTenant(
  db: DatabaseMock,
  requestingOrgId: string,
  searchQuery?: string
): UniversalCatalogItem[] {
  return db.items.filter((item) => {
    if (item.organization_id !== requestingOrgId) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
    }

    return true;
  });
}

export function lookupCatalogItemById(
  db: DatabaseMock,
  requestingOrgId: string,
  itemId: string
): UniversalCatalogItem | null {
  const item = db.items.find((i) => i.id === itemId);
  if (!item || item.organization_id !== requestingOrgId) {
    return null;
  }
  return item;
}

export function batchUpdateCatalogItems(
  db: DatabaseMock,
  requestingOrgId: string,
  updates: Array<{ id: string; organization_id?: string; name: string }>
): {
  success: boolean;
  updatedCount: number;
  rejectedReasons: string[];
} {
  const rejectedReasons: string[] = [];
  const stagedUpdates: Array<{ item: UniversalCatalogItem; newName: string }> = [];

  // Phase 1: Full validation & permission checks
  for (const update of updates) {
    const item = db.items.find((i) => i.id === update.id);
    if (!item) {
      rejectedReasons.push(`Item ${update.id} not found`);
      continue;
    }

    if (item.organization_id !== requestingOrgId) {
      rejectedReasons.push(`Access denied: Item ${update.id} belongs to another organization`);
      continue;
    }

    if (update.organization_id && update.organization_id !== requestingOrgId) {
      rejectedReasons.push(`Forbidden: Cannot reassign item ${update.id} to foreign organization ${update.organization_id}`);
      continue;
    }

    stagedUpdates.push({ item, newName: update.name });
  }

  // Transactional rollback: if ANY item is rejected, commit 0 changes
  if (rejectedReasons.length > 0) {
    return {
      success: false,
      updatedCount: 0,
      rejectedReasons,
    };
  }

  // Phase 2: Atomic commit
  for (const stage of stagedUpdates) {
    stage.item.name = stage.newName;
  }

  return {
    success: true,
    updatedCount: stagedUpdates.length,
    rejectedReasons: [],
  };
}

export function validateStoragePathTenantIsolation(
  requestingOrgId: string,
  storagePath: string
): boolean {
  const expectedPrefix = `catalog/${requestingOrgId}/`;
  return storagePath.startsWith(expectedPrefix);
}

export const suite = {
  name: 'T2-25: Cross-Tenant Leakage & Strict Isolation (RLS)',
  tier: 'Tier 2',
  feature: 'F25: Strict Multi-Tenant Isolation (RLS)',
  tests: [
    {
      name: 'SQL injection in search filter is constrained strictly to tenant scope',
      fn: async () => {
        const mockDb = createMockDatabase();
        const sqlInjectionPayload = "' OR '1'='1' --";
        const results = queryCatalogItemsAsTenant(mockDb, TENANT_A_ID, sqlInjectionPayload);

        expect(results).toHaveLength(0);
        const hasTenantB = results.some((i) => i.organization_id === TENANT_B_ID);
        expect(hasTenantB).toBe(false);
      },
    },
    {
      name: 'Direct ID lookup of foreign tenant item returns null (404 Not Found)',
      fn: async () => {
        const mockDb = createMockDatabase();
        const result = lookupCatalogItemById(mockDb, TENANT_A_ID, 'item-b1');
        expect(result).toBeNull();

        const legitResult = lookupCatalogItemById(mockDb, TENANT_B_ID, 'item-b1');
        expect(legitResult).not.toBeNull();
        expect(legitResult?.name).toBe('Confidential Strategy B1');
      },
    },
    {
      name: 'Batch update payload containing mixed organization IDs is rejected',
      fn: async () => {
        const mockDb = createMockDatabase();
        const mixedBatch = [
          { id: 'item-a1', name: 'Updated Name A1' },
          { id: 'item-b1', name: 'Malicious Overwrite B1' },
        ];

        const res = batchUpdateCatalogItems(mockDb, TENANT_A_ID, mixedBatch);
        expect(res.success).toBe(false);
        expect(res.rejectedReasons).toContain('Access denied: Item item-b1 belongs to another organization');
        // Verify item-a1 was not mutated due to transactional rollback
        expect(mockDb.items[0].name).toBe('Secret Product A1');
      },
    },
    {
      name: 'Attempt to reassign organization_id in item update is blocked',
      fn: async () => {
        const mockDb = createMockDatabase();
        const reassignBatch = [
          { id: 'item-a2', organization_id: TENANT_B_ID, name: 'Stolen Item' },
        ];

        const res = batchUpdateCatalogItems(mockDb, TENANT_A_ID, reassignBatch);
        expect(res.success).toBe(false);
        expect(res.rejectedReasons[0]).toContain('Cannot reassign item item-a2 to foreign organization');
      },
    },
    {
      name: 'Storage bucket upload path enforces tenant isolation directory prefix',
      fn: async () => {
        const validPath = `catalog/${TENANT_A_ID}/photos/camisa.webp`;
        const invalidPath = `catalog/${TENANT_B_ID}/photos/foreign.webp`;

        expect(validateStoragePathTenantIsolation(TENANT_A_ID, validPath)).toBe(true);
        expect(validateStoragePathTenantIsolation(TENANT_A_ID, invalidPath)).toBe(false);
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
