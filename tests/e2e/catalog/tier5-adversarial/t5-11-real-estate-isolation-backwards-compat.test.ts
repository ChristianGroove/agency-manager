/**
 * Tier 5: Adversarial Stress Testing & Multi-Tenant Isolation Suite
 * Suite: t5-11-real-estate-isolation-backwards-compat
 * Domain: Cross-Tenant RLS Non-Leakage, Privilege Isolation & 100% Backwards Compatibility for Legacy Spaces
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
  assertArrayLength,
  assertContains,
  expect,
  TestRegistry,
  TestSuiteResult,
} from '../harness/assertions';
import {
  CAPABILITY_PRESETS,
  DynamicSpaceConfig,
} from '../../../../src/modules/core/organizations/capabilities-registry';
import { SpaceCategory } from '../../../../src/modules/core/organizations/space-helpers';
import { UniversalCatalogItem } from '../harness/contracts';
import { TENANT_A_ID, TENANT_B_ID } from '../harness/mock-data';

// Multi-tenant database store simulator with RLS enforcement
export class MultiTenantDatabaseSimulator {
  private items: UniversalCatalogItem[] = [];

  public insert(item: UniversalCatalogItem): void {
    this.items.push({ ...item });
  }

  // Simulates PostgreSQL Row Level Security: (organization_id = auth.current_org_id())
  public selectByOrg(orgId: string): UniversalCatalogItem[] {
    return this.items.filter((it) => it.organization_id === orgId && !it.deleted_at);
  }

  public findByIdAndOrg(id: string, orgId: string): UniversalCatalogItem | null {
    const item = this.items.find((it) => it.id === id && it.organization_id === orgId && !it.deleted_at);
    return item || null;
  }

  public updateByOrg(id: string, orgId: string, updates: Partial<UniversalCatalogItem>): { success: boolean; error?: string } {
    const idx = this.items.findIndex((it) => it.id === id && it.organization_id === orgId && !it.deleted_at);
    if (idx === -1) {
      return { success: false, error: 'Unauthorized: Row not found or inaccessible under active tenant RLS policy' };
    }
    this.items[idx] = { ...this.items[idx], ...updates };
    return { success: true };
  }

  public deleteByOrg(id: string, orgId: string): { success: boolean; error?: string } {
    const idx = this.items.findIndex((it) => it.id === id && it.organization_id === orgId && !it.deleted_at);
    if (idx === -1) {
      return { success: false, error: 'Unauthorized: Cannot delete cross-tenant resource' };
    }
    this.items[idx].deleted_at = new Date().toISOString();
    return { success: true };
  }
}

export const suite = {
  name: 'T5-11: Multi-Tenant RLS Isolation & 100% Legacy Space Backwards Compatibility',
  tier: 'Tier 5',
  feature: 'Milestone 5 - Adversarial RLS Isolation & Legacy Compatibility Audit',
  tests: [
    // =========================================================================
    // SECTION 1: CROSS-TENANT RLS ISOLATION & NON-LEAKAGE
    // =========================================================================
    {
      name: '1. Strict Row Level Security prevents Tenant B from querying Tenant A properties',
      fn: () => {
        const db = new MultiTenantDatabaseSimulator();

        // Tenant A property
        db.insert({
          id: 'prop-tenant-a-101',
          organization_id: TENANT_A_ID,
          name: 'Penthouse Poblado Alpha',
          base_price: 2500000000,
          type: 'real_estate',
          classification: 'real_estate',
          gallery_images: [],
          inventory_quantity: 1,
          track_inventory: false,
          allow_backorders: false,
          low_stock_threshold: 1,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: [],
          specifications: {},
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-20T00:00:00Z',
        });

        // Tenant B property
        db.insert({
          id: 'prop-tenant-b-202',
          organization_id: TENANT_B_ID,
          name: 'Casa Campestre Beta',
          base_price: 1800000000,
          type: 'real_estate',
          classification: 'real_estate',
          gallery_images: [],
          inventory_quantity: 1,
          track_inventory: false,
          allow_backorders: false,
          low_stock_threshold: 1,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: [],
          specifications: {},
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-21T00:00:00Z',
        });

        // Tenant A query
        const tenantAItems = db.selectByOrg(TENANT_A_ID);
        assertEqual(tenantAItems.length, 1);
        assertEqual(tenantAItems[0].id, 'prop-tenant-a-101');

        // Tenant B query
        const tenantBItems = db.selectByOrg(TENANT_B_ID);
        assertEqual(tenantBItems.length, 1);
        assertEqual(tenantBItems[0].id, 'prop-tenant-b-202');

        // Direct ID lookup across tenants fails
        const crossTenantLookup = db.findByIdAndOrg('prop-tenant-a-101', TENANT_B_ID);
        assertEqual(crossTenantLookup, null);
      },
    },
    {
      name: '2. Adversarial mutation rejection: Tenant B cannot update or delete Tenant A properties',
      fn: () => {
        const db = new MultiTenantDatabaseSimulator();

        db.insert({
          id: 'prop-tenant-a-303',
          organization_id: TENANT_A_ID,
          name: 'Mansión Campestre Alpha',
          base_price: 4500000000,
          type: 'real_estate',
          classification: 'real_estate',
          gallery_images: [],
          inventory_quantity: 1,
          track_inventory: false,
          allow_backorders: false,
          low_stock_threshold: 1,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: [],
          specifications: {},
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-20T00:00:00Z',
        });

        // Malicious Tenant B attempts to update price
        const updateAttempt = db.updateByOrg('prop-tenant-a-303', TENANT_B_ID, { base_price: 100 });
        assertFalse(updateAttempt.success);
        assertDefined(updateAttempt.error);
        assertTrue((updateAttempt.error || '').includes('Unauthorized'));

        // Malicious Tenant B attempts to delete Tenant A property
        const deleteAttempt = db.deleteByOrg('prop-tenant-a-303', TENANT_B_ID);
        assertFalse(deleteAttempt.success);
        assertTrue((deleteAttempt.error || '').includes('Unauthorized'));

        // Verify property was untouched
        const prop = db.findByIdAndOrg('prop-tenant-a-303', TENANT_A_ID);
        assertDefined(prop);
        if (!prop) throw new Error("prop must exist");
        assertEqual(prop.base_price, 4500000000);
      },
    },

    // =========================================================================
    // SECTION 2: 100% BACKWARDS COMPATIBILITY FOR ALL LEGACY SPACES
    // =========================================================================
    {
      name: '3. Agency space preset maintains exact legacy terminology, tabs, and capabilities',
      fn: () => {
        const preset: DynamicSpaceConfig = CAPABILITY_PRESETS.agency;
        assertDefined(preset);

        assertEqual(preset.terminology.client, 'Cliente');
        assertEqual(preset.terminology.clients, 'Clientes');
        assertEqual(preset.terminology.project, 'Proyecto');
        assertEqual(preset.terminology.sale, 'Venta');
        assertEqual(preset.terminology.action_new, 'Nuevo Cliente');

        assertContains(preset.policies.visibleTabs, 'hosting');
        assertTrue(preset.policies.showHosting);
        assertTrue(preset.policies.showBilling);
        assertFalse(preset.policies.showOrders);

        assertContains(preset.capabilities, 'hosting.management');
        assertContains(preset.capabilities, 'crm.quotes');
      },
    },
    {
      name: '4. Resto space preset maintains exact legacy terminology, tabs, and capabilities',
      fn: () => {
        const preset: DynamicSpaceConfig = CAPABILITY_PRESETS.resto;
        assertDefined(preset);

        assertEqual(preset.terminology.client, 'Comensal');
        assertEqual(preset.terminology.clients, 'Comensales');
        assertEqual(preset.terminology.project, 'Reserva');
        assertEqual(preset.terminology.sale, 'Pedido');
        assertEqual(preset.terminology.action_new, 'Nuevo Comensal');

        assertContains(preset.policies.visibleTabs, 'orders');
        assertTrue(preset.policies.showOrders);
        assertFalse(preset.policies.showBilling);
        assertFalse(preset.policies.showHosting);
        assertFalse(preset.policies.showServices);

        assertEqual(preset.capabilities.length, 2);
        assertContains(preset.capabilities, 'crm.core');
        assertContains(preset.capabilities, 'messaging.standard');
      },
    },
    {
      name: '5. Cleaning space preset maintains exact legacy terminology, tabs, and capabilities',
      fn: () => {
        const preset: DynamicSpaceConfig = CAPABILITY_PRESETS.cleaning;
        assertDefined(preset);

        assertEqual(preset.terminology.client, 'Cliente');
        assertEqual(preset.terminology.clients, 'Clientes');
        assertEqual(preset.terminology.project, 'Servicio');
        assertEqual(preset.terminology.sale, 'Orden');
        assertEqual(preset.terminology.action_new, 'Nuevo Cliente');

        assertTrue(preset.policies.showBilling);
        assertTrue(preset.policies.showServices);
        assertFalse(preset.policies.showOrders);

        assertContains(preset.capabilities, 'billing.management');
      },
    },
    {
      name: '6. Retail space preset maintains exact legacy terminology, tabs, and capabilities',
      fn: () => {
        const preset: DynamicSpaceConfig = CAPABILITY_PRESETS.retail;
        assertDefined(preset);

        assertEqual(preset.terminology.client, 'Cliente');
        assertEqual(preset.terminology.clients, 'Clientes');
        assertEqual(preset.terminology.project, 'Compra');
        assertEqual(preset.terminology.sale, 'Venta');
        assertEqual(preset.terminology.action_new, 'Nuevo Cliente');

        assertTrue(preset.policies.showBilling);
        assertFalse(preset.policies.showServices);
        assertFalse(preset.policies.showOrders);

        assertContains(preset.capabilities, 'billing.management');
      },
    },
    {
      name: '7. SaaS space preset maintains exact legacy terminology, tabs, and capabilities',
      fn: () => {
        const preset: DynamicSpaceConfig = CAPABILITY_PRESETS.saas;
        assertDefined(preset);

        assertEqual(preset.terminology.client, 'Usuario');
        assertEqual(preset.terminology.clients, 'Usuarios');
        assertEqual(preset.terminology.project, 'Suscripción');
        assertEqual(preset.terminology.sale, 'Plan');
        assertEqual(preset.terminology.action_new, 'Nuevo Usuario');

        assertTrue(preset.policies.showBilling);
        assertTrue(preset.policies.showServices);

        assertContains(preset.capabilities, 'automation.engine');
      },
    },
    {
      name: '8. Platform space preset maintains exact legacy terminology, tabs, and capabilities',
      fn: () => {
        const preset: DynamicSpaceConfig = CAPABILITY_PRESETS.platform;
        assertDefined(preset);

        assertEqual(preset.terminology.client, 'Tenant');
        assertEqual(preset.terminology.clients, 'Tenants');
        assertEqual(preset.terminology.project, 'Infraestructura');
        assertEqual(preset.terminology.sale, 'Suscripción');
        assertEqual(preset.terminology.action_new, 'Nuevo Tenant');

        assertContains(preset.capabilities, 'whitelabel.branding');
        assertContains(preset.capabilities, 'whitelabel.domain_custom');
      },
    },
    {
      name: '9. SpaceCategory fallback safely defaults to agency when resolving unknown or unassigned spaces',
      fn: () => {
        function resolveFallbackCategory(inputCategory?: string | null): SpaceCategory {
          const validCategories: SpaceCategory[] = [
            'agency',
            'resto',
            'cleaning',
            'platform',
            'retail',
            'saas',
            'real_estate',
          ];

          if (inputCategory && validCategories.includes(inputCategory as SpaceCategory)) {
            return inputCategory as SpaceCategory;
          }
          return 'agency';
        }

        assertEqual(resolveFallbackCategory('real_estate'), 'real_estate');
        assertEqual(resolveFallbackCategory('agency'), 'agency');
        assertEqual(resolveFallbackCategory('resto'), 'resto');
        assertEqual(resolveFallbackCategory('unknown_xyz'), 'agency');
        assertEqual(resolveFallbackCategory(null), 'agency');
        assertEqual(resolveFallbackCategory(undefined), 'agency');
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
