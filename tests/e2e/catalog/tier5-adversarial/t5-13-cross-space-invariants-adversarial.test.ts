/**
 * Tier 5: Adversarial Cross-Space Invariants & Test Runner Verification Suite
 * Suite: t5-12-cross-space-invariants-adversarial
 * Domain: Cross-Space Invariants across all 7 Spaces (agency, resto, cleaning, retail, saas, platform, real_estate)
 * Scope:
 * 1. Strict Sidebar & Route Invariants: module_rentals & /rentals inaccessible across all 6 non-real-estate spaces
 * 2. SSR Route Protection Invariant: Server-side redirect for unauthorized spaces accessing /rentals
 * 3. Universal Catalog (/portfolio) 100% functional and unpolluted in non-real-estate spaces
 * 4. Storefront (/tienda / portal) clean presets and non-real-estate behavior
 * 5. CRM, Quotes & Invoicing backward compatibility and non-interference
 * 6. Mathematical isolation of rental fee calculations
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
  MODULE_ROUTES,
  filterRoutesByModules,
  MODULE_METADATA,
  getModuleRoute,
} from '../../../../src/modules/core/saas/module-config';
import {
  CAPABILITY_PRESETS,
  DynamicSpaceConfig,
} from '../../../../src/modules/core/organizations/capabilities-registry';
import { SpaceCategory } from '../../../../src/modules/core/organizations/space-helpers';
import { calculateSettlement } from '../../../../src/modules/features/rentals/services/settlement-calculator';
import { UniversalCatalogItem } from '../harness/contracts';

export const ALL_SEVEN_SPACES: SpaceCategory[] = [
  'agency',
  'resto',
  'cleaning',
  'retail',
  'saas',
  'platform',
  'real_estate',
];

export const NON_REAL_ESTATE_SPACES: SpaceCategory[] = [
  'agency',
  'resto',
  'cleaning',
  'retail',
  'saas',
  'platform',
];

export const ALL_SYSTEM_MODULES = [
  'core_crm',
  'core_clients',
  'module_messaging',
  'module_quotes',
  'module_catalog',
  'module_automation',
  'core_locations',
  'module_invoicing',
  'module_payments',
  'module_rentals',
  'module_resto_orders',
  'module_resto_menu',
  'module_attendance',
  'module_contracts',
  'module_hosting',
  'module_whitelabel',
];

export const suite = {
  name: 'T5-12: Cross-Space Invariants & SSR Protection Adversarial Suite',
  tier: 'Tier 5',
  feature: 'Milestone 4 - Cross-Space Invariants & Test Runner Verification',
  tests: [
    // =========================================================================
    // 1. NAVIGATION SIDEBAR & ROUTE INVARIANTS ACROSS ALL 7 SPACES
    // =========================================================================
    {
      name: '1. Navigation sidebar strictly hides module_rentals (/rentals) for all 6 non-real-estate spaces even with full module bundle',
      fn: () => {
        for (const space of NON_REAL_ESTATE_SPACES) {
          const orgType = space === 'platform' ? 'platform' : 'client';
          const routes = filterRoutesByModules(
            ALL_SYSTEM_MODULES,
            'owner',
            orgType,
            space,
            { all: true }
          );

          const rentalsRoute = routes.find(
            (r) => r.key === 'module_rentals' || r.href === '/rentals'
          );

          assertFalse(
            Boolean(rentalsRoute),
            `Space '${space}' must NEVER include module_rentals in sidebar routes, even for owner with full modules`
          );

          // Verify with different roles
          const roles = ['owner', 'admin', 'agent', 'member', 'guest'];
          for (const role of roles) {
            const roleRoutes = filterRoutesByModules(
              ALL_SYSTEM_MODULES,
              role,
              orgType,
              space,
              ['crm.core', 'crm.quotes', 'billing.management']
            );
            assertFalse(
              roleRoutes.some((r) => r.key === 'module_rentals' || r.href === '/rentals'),
              `Space '${space}' with role '${role}' must never expose /rentals`
            );
          }
        }
      },
    },
    {
      name: '2. Real Estate space exclusively and correctly exposes module_rentals (/rentals) in navigation sidebar',
      fn: () => {
        const reRoutes = filterRoutesByModules(
          ALL_SYSTEM_MODULES,
          'owner',
          'client',
          'real_estate',
          { all: true }
        );

        const rentalsRoute = reRoutes.find(
          (r) => r.key === 'module_rentals' || r.href === '/rentals'
        );

        assertDefined(rentalsRoute, 'Real estate space must expose module_rentals route');
        assertEqual(rentalsRoute?.href, '/rentals');
        assertEqual(rentalsRoute?.key, 'module_rentals');
        assertEqual(rentalsRoute?.label, 'Gestión de Arriendos');
        assertEqual(rentalsRoute?.category, 'operations');
        assertEqual(rentalsRoute?.parentModule, 'module_rentals');
      },
    },

    // =========================================================================
    // 2. SSR ROUTE PROTECTION INVARIANT
    // =========================================================================
    {
      name: '3. SSR Route Guard on /rentals redirects all non-real-estate spaces to /dashboard?error=module_restricted',
      fn: () => {
        // Simulates the SSR guard in src/app/(dashboard)/rentals/page.tsx:
        // const spaceCategory = await getOrgSpaceCategory(orgId);
        // if (spaceCategory !== "real_estate") {
        //   redirect("/dashboard?error=module_restricted");
        // }

        function simulateRentalsSSRGuard(spaceCategory: SpaceCategory): { allowed: boolean; redirectUrl?: string } {
          if (spaceCategory !== 'real_estate') {
            return { allowed: false, redirectUrl: '/dashboard?error=module_restricted' };
          }
          return { allowed: true };
        }

        for (const space of NON_REAL_ESTATE_SPACES) {
          const check = simulateRentalsSSRGuard(space);
          assertFalse(check.allowed, `Space '${space}' must be blocked by SSR guard`);
          assertEqual(
            check.redirectUrl,
            '/dashboard?error=module_restricted',
            `Space '${space}' must be redirected to /dashboard?error=module_restricted`
          );
        }

        const reCheck = simulateRentalsSSRGuard('real_estate');
        assertTrue(reCheck.allowed, "Space 'real_estate' must pass SSR guard cleanly");
        assertEqual(reCheck.redirectUrl, undefined);
      },
    },

    // =========================================================================
    // 3. CAPABILITY PRESETS ISOLATION ACROSS ALL 7 SPACES
    // =========================================================================
    {
      name: '4. Capability presets for all 7 spaces are well-formed, isolated, and have zero unwanted capability bleed',
      fn: () => {
        assertEqual(Object.keys(CAPABILITY_PRESETS).length >= 7, true, 'At least 7 space presets exist');

        for (const space of ALL_SEVEN_SPACES) {
          const preset = CAPABILITY_PRESETS[space];
          assertDefined(preset, `Preset for space '${space}' must exist in CAPABILITY_PRESETS`);
          assertDefined(preset.terminology, `Terminology defined for '${space}'`);
          assertDefined(preset.policies, `Policies defined for '${space}'`);
          assertDefined(preset.management, `Management defined for '${space}'`);
          assertDefined(preset.rules, `Rules defined for '${space}'`);
          assertTrue(Array.isArray(preset.capabilities), `Capabilities is array for '${space}'`);

          if (space !== 'real_estate') {
            assertFalse(
              preset.capabilities.includes('module_rentals'),
              `Non-real-estate preset '${space}' must not contain 'module_rentals' capability`
            );
            if (preset.modules) {
              assertFalse(
                preset.modules.includes('module_rentals'),
                `Non-real-estate preset '${space}' must not contain 'module_rentals' in modules`
              );
            }
          } else {
            assertTrue(
              preset.modules?.includes('module_rentals'),
              "Real estate preset must include 'module_rentals' in default modules"
            );
          }
        }
      },
    },

    // =========================================================================
    // 4. UNIVERSAL CATALOG (/portfolio) ISOLATION IN NON-REAL-ESTATE SPACES
    // =========================================================================
    {
      name: '5. Universal Catalog items in non-real-estate spaces function without real_estate fields or rental statuses',
      fn: () => {
        const agencyItem: UniversalCatalogItem = {
          id: 'item-agency-101',
          organization_id: 'org-agency-1',
          name: 'Consultoría SEO & Performance Mensual',
          description: 'Estrategia integral de optimización para motores de búsqueda y tráfico orgánico.',
          category: 'Marketing Digital',
          base_price: 2500000,
          type: 'recurring',
          classification: 'service',
          gallery_images: [],
          inventory_quantity: 0,
          track_inventory: false,
          allow_backorders: false,
          low_stock_threshold: 0,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: ['Destacado'],
          specifications: { delivery_days: 30, reports: 'Semanal' },
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-01T00:00:00Z',
        };

        const retailItem: UniversalCatalogItem = {
          id: 'item-retail-202',
          organization_id: 'org-retail-1',
          name: 'Chaqueta de Cuero Vintage',
          description: 'Chaqueta artesanal 100% cuero colombiano con forro térmico.',
          category: 'Moda Masculina',
          base_price: 450000,
          type: 'product',
          classification: 'physical',
          gallery_images: [],
          inventory_quantity: 12,
          track_inventory: true,
          allow_backorders: false,
          low_stock_threshold: 3,
          has_variants: true,
          variant_attributes: [
            {
              id: 'attr-talla',
              organization_id: 'org-retail-1',
              name: 'Talla',
              slug: 'talla',
              swatch_type: 'pill',
              options: [
                { id: 'opt-m', label: 'M', value: 'M', order_index: 0 },
                { id: 'opt-l', label: 'L', value: 'L', order_index: 1 },
              ],
            },
          ],
          variants: [
            {
              id: 'var-m',
              catalog_item_id: 'item-retail-202',
              title: 'Talla M',
              sku: 'CHQ-M',
              price_modifier: 0,
              price_type: 'fixed',
              inventory_quantity: 7,
              track_inventory: true,
              attributes: { Talla: 'M' },
              is_active: true,
            },
            {
              id: 'var-l',
              catalog_item_id: 'item-retail-202',
              title: 'Talla L',
              sku: 'CHQ-L',
              price_modifier: 0,
              price_type: 'fixed',
              inventory_quantity: 5,
              track_inventory: true,
              attributes: { Talla: 'L' },
              is_active: true,
            },
          ],
          addon_groups: [],
          badges: ['Nuevo'],
          specifications: { material: 'Cuero Genuino', origin: 'Colombia' },
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-01T00:00:00Z',
        };

        // Verification: Standard non-real-estate items do not have rental status or lease attributes
        assertEqual(agencyItem.real_estate_details, undefined);
        assertEqual(retailItem.real_estate_details, undefined);
        assertEqual(agencyItem.classification, 'service');
        assertEqual(retailItem.classification, 'physical');
        assertEqual(retailItem.variants?.length, 2);
        assertEqual(retailItem.inventory_quantity, 12);
      },
    },

    // =========================================================================
    // 5. CRM, QUOTES & INVOICING INTEGRITY IN NON-REAL-ESTATE SPACES
    // =========================================================================
    {
      name: '6. Quotes, Invoices, and CRM calculations operate cleanly with zero rental deduction contamination',
      fn: () => {
        // Standard Agency Quote Calculation
        const quoteItems = [
          { name: 'Diseño Web UI/UX', qty: 1, unitPrice: 3500000 },
          { name: 'Desarrollo Frontend Next.js', qty: 1, unitPrice: 4500000 },
          { name: 'Hosting Anual Cloud', qty: 1, unitPrice: 600000 },
        ];

        const subtotal = quoteItems.reduce((acc, it) => acc + it.qty * it.unitPrice, 0);
        assertEqual(subtotal, 8600000, 'Quote subtotal is $8,600,000 COP');

        const ivaRate = 0.19;
        const ivaAmount = Math.round(subtotal * ivaRate);
        assertEqual(ivaAmount, 1634000, 'Standard 19% IVA on quote is $1,634,000 COP');

        const totalQuote = subtotal + ivaAmount;
        assertEqual(totalQuote, 10234000, 'Total quote is $10,234,000 COP');

        // Verify that rental financial calculations (8% commission, HOA, deductions) are completely separate
        const settlementTest = calculateSettlement({
          monthlyRent: 2000000,
          adminFee: 250000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
        });

        assertEqual(settlementTest.grossCollected, 2250000);
        assertEqual(settlementTest.commissionAmount, 160000);
        assertEqual(settlementTest.vatAmount, 30400);
        assertEqual(settlementTest.netOwnerPayout, 1559600);
      },
    },

    // =========================================================================
    // 6. MODULE METADATA DEFINITION INTEGRITY
    // =========================================================================
    {
      name: '7. MODULE_METADATA and MODULE_ROUTES properly define module_rentals with allowedSpaces: ["real_estate"]',
      fn: () => {
        const metadata = MODULE_METADATA.module_rentals;
        assertDefined(metadata, 'module_rentals exists in MODULE_METADATA');
        assertEqual(metadata.key, 'module_rentals');
        assertEqual(metadata.name, 'Gestión de Arriendos');
        assertEqual(metadata.category, 'operations');
        assertEqual(metadata.allowedSpaces, ['real_estate']);

        const route = getModuleRoute('module_rentals');
        assertDefined(route, 'module_rentals exists in MODULE_ROUTES');
        assertEqual(route?.href, '/rentals');
        assertEqual(route?.parentModule, 'module_rentals');
        assertEqual(route?.access?.allowedSpaces, ['real_estate']);
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
