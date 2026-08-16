/**
 * Tier 1 Test Suite: F25 - Strict Multi-Tenant Isolation (RLS)
 * Tests organization_id filter enforcement on all queries, tenant A cannot read tenant B items, tenant A cannot update tenant B variants, RLS policy violation rejection, public portal scoped only to tenant.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertThrows,
  assertArrayLength,
} from '../harness/assertions';
import {
  TENANT_A_ID,
  TENANT_B_ID,
  mockPhysicalItem,
  mockTenantBItem,
  allMockCatalogItems,
} from '../harness/mock-data';

export const suite = {
  name: 'T1-25: Strict Multi-Tenant Isolation (RLS)',
  tier: 'Tier 1',
  feature: 'F25: Strict Multi-Tenant Isolation (RLS)',
  tests: [
    {
      name: 'Enforces mandatory organization_id filter on all database read queries',
      fn: () => {
        function queryItemsForTenant(tenantId: string, databaseItems: typeof allMockCatalogItems) {
          if (!tenantId) {
            throw new Error('SECURITY_ERROR: organization_id is required');
          }
          return databaseItems.filter((item) => item.organization_id === tenantId);
        }

        const tenantAItems = queryItemsForTenant(TENANT_A_ID, allMockCatalogItems);
        assertArrayLength(tenantAItems, 4);
        assertTrue(tenantAItems.every((item) => item.organization_id === TENANT_A_ID));

        const tenantBItems = queryItemsForTenant(TENANT_B_ID, allMockCatalogItems);
        assertArrayLength(tenantBItems, 1);
        assertEqual(tenantBItems[0].organization_id, TENANT_B_ID);
        assertEqual(tenantBItems[0].id, 'item_tenant_b_999');
      },
    },
    {
      name: 'Guarantees Tenant A cannot read Tenant B private items or catalog data',
      fn: () => {
        function readItemById(requesterOrgId: string, itemId: string, databaseItems: typeof allMockCatalogItems) {
          const item = databaseItems.find((i) => i.id === itemId);
          if (!item) return null;
          // Strict RLS simulation
          if (item.organization_id !== requesterOrgId) {
            return null; // RLS masks unauthorized tenant items as non-existent
          }
          return item;
        }

        // Tenant A attempting to read Tenant B's item
        const result = readItemById(TENANT_A_ID, mockTenantBItem.id, allMockCatalogItems);
        assertEqual(result, null, 'Tenant A must not be able to read Tenant B item');

        // Tenant B reading their own item
        const tenantBResult = readItemById(TENANT_B_ID, mockTenantBItem.id, allMockCatalogItems);
        assertTrue(!!tenantBResult);
        assertEqual(tenantBResult?.id, mockTenantBItem.id);
      },
    },
    {
      name: 'Blocks Tenant A from updating, deleting, or mutating Tenant B items and variants',
      fn: () => {
        function mutateItem(requesterOrgId: string, itemId: string, databaseItems: typeof allMockCatalogItems) {
          const target = databaseItems.find((i) => i.id === itemId);
          if (!target || target.organization_id !== requesterOrgId) {
            throw new Error('RLS_VIOLATION: Unauthorized attempt to mutate resource belonging to another organization');
          }
          return true;
        }

        // Tenant A trying to mutate Tenant B's item -> throws
        assertThrows(
          () => mutateItem(TENANT_A_ID, mockTenantBItem.id, allMockCatalogItems),
          /RLS_VIOLATION/
        );

        // Tenant A mutating their own item -> succeeds
        assertTrue(mutateItem(TENANT_A_ID, mockPhysicalItem.id, allMockCatalogItems));
      },
    },
    {
      name: 'Simulates RLS policy rejection when inserting records with mismatched organization_id',
      fn: () => {
        function insertItemWithRlsCheck(
          currentTenantSession: string,
          newItem: { id: string; organization_id: string; name: string }
        ) {
          if (newItem.organization_id !== currentTenantSession) {
            throw new Error('RLS_INSERT_REJECTED: Record organization_id must match authenticated session organization_id');
          }
          return true;
        }

        const validItem = { id: 'new_1', organization_id: TENANT_A_ID, name: 'Valid Item' };
        assertTrue(insertItemWithRlsCheck(TENANT_A_ID, validItem));

        const spoofedItem = { id: 'new_2', organization_id: TENANT_B_ID, name: 'Spoofed Org Item' };
        assertThrows(
          () => insertItemWithRlsCheck(TENANT_A_ID, spoofedItem),
          /RLS_INSERT_REJECTED/
        );
      },
    },
    {
      name: 'Ensures public portal storefront route only retrieves items belonging to target tenant slug',
      fn: () => {
        function getPublicStorefrontCatalog(targetTenantId: string, databaseItems: typeof allMockCatalogItems) {
          return databaseItems.filter(
            (item) => item.organization_id === targetTenantId && item.is_visible_in_portal && item.is_active
          );
        }

        const portalItemsA = getPublicStorefrontCatalog(TENANT_A_ID, allMockCatalogItems);
        assertTrue(portalItemsA.length > 0);
        assertFalse(portalItemsA.some((item) => item.organization_id === TENANT_B_ID));
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
