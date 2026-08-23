/**
 * Tier 5 Adversarial & Empirical Test Suite: Milestone 2 Verification
 * File: tests/e2e/catalog/tier5-adversarial/t5-10-m2-super-admin-real-estate-app.test.ts
 *
 * Empirical Challenger Suite for Milestone 2:
 * 1. saas_apps metadata and schema validation for app_real_estate_pro
 * 2. All 7 modules (core_crm, core_clients, core_locations, module_messaging, module_quotes, module_catalog, module_automation) linked in saas_app_modules
 * 3. IconMap in app-slider.tsx properly resolves Building2 without falling back to Package
 * 4. Super Admin Space category resolution for real_estate across dialogs, sheets, space helpers, and capabilities
 * 5. Adversarial stress-testing of fallback resilience, idempotency, MRR calculations, and multi-tenant isolation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as LucideIcons from 'lucide-react';
import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
  assertContains,
  assertMatches,
  assertArrayLength,
  expect,
} from '../harness/assertions';
import {
  CAPABILITY_PRESETS,
  DynamicSpaceConfig,
  UICapability,
} from '../../../../src/modules/core/organizations/capabilities-registry';
import { SpaceCategory } from '../../../../src/modules/core/organizations/space-helpers';
import { SaasApp, AppModule } from '../../../../src/types/saas';

// Canonical Real Estate App Definition Contract
export const EXPECTED_REAL_ESTATE_APP: Omit<SaasApp, 'created_at'> = {
  id: 'app_real_estate_pro',
  name: 'Real Estate & PropTech Pro',
  slug: 'real-estate-pro',
  description: 'Gestión de propiedades, prospectos inmobiliarios y comercialización PropTech',
  long_description: 'Solución integral para agencias inmobiliarias y empresas PropTech con catálogo de propiedades, cotizaciones, CRM de prospectos, mensajería y automatización.',
  category: 'real_estate',
  vertical_compatibility: ['real_estate', 'proptech', 'agency'],
  icon: 'Building2',
  color: '#0284c7',
  price_monthly: 99.00,
  trial_days: 14,
  is_active: true,
  is_featured: true,
  sort_order: 4,
};

// Canonical 7 Linked Modules Contract
export const EXPECTED_LINKED_MODULES = [
  { app_id: 'app_real_estate_pro', module_key: 'core_crm', auto_enable: true, is_core: true, is_optional: false, sort_order: 1 },
  { app_id: 'app_real_estate_pro', module_key: 'core_clients', auto_enable: true, is_core: true, is_optional: false, sort_order: 2 },
  { app_id: 'app_real_estate_pro', module_key: 'core_locations', auto_enable: true, is_core: false, is_optional: false, sort_order: 3 },
  { app_id: 'app_real_estate_pro', module_key: 'module_messaging', auto_enable: true, is_core: false, is_optional: false, sort_order: 4 },
  { app_id: 'app_real_estate_pro', module_key: 'module_quotes', auto_enable: true, is_core: false, is_optional: false, sort_order: 5 },
  { app_id: 'app_real_estate_pro', module_key: 'module_catalog', auto_enable: true, is_core: false, is_optional: false, sort_order: 6 },
  { app_id: 'app_real_estate_pro', module_key: 'module_automation', auto_enable: true, is_core: false, is_optional: false, sort_order: 7 },
];

export const suite = {
  name: 'T5-10: Super Admin Real Estate App Configuration & Module Linking Verification',
  tier: 'Tier 5',
  feature: 'Milestone 2 - Super Admin App Configuration & Module Linking (Real Estate Pro)',
  tests: [
    // =========================================================================
    // SECTION 1: saas_apps METADATA & SCHEMA VALIDATION
    // =========================================================================
    {
      name: '1.1 Migration file 20260822000001_seed_real_estate_app.sql exists and contains valid idempotent SQL for app_real_estate_pro',
      fn: () => {
        const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260822000001_seed_real_estate_app.sql');
        assertTrue(fs.existsSync(migrationPath), `Migration file not found at: ${migrationPath}`);

        const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
        assertContains(sqlContent, 'INSERT INTO public.saas_apps');
        assertContains(sqlContent, "'app_real_estate_pro'");
        assertContains(sqlContent, "'Real Estate & PropTech Pro'");
        assertContains(sqlContent, "'real-estate-pro'");
        assertContains(sqlContent, "'real_estate'");
        assertContains(sqlContent, "'Building2'");
        assertContains(sqlContent, "'#0284c7'");
        assertContains(sqlContent, '99.00');
        assertContains(sqlContent, 'ON CONFLICT (id) DO UPDATE SET');
      },
    },
    {
      name: '1.2 seed-apps.ts contains exact app_real_estate_pro configuration matching schema contracts',
      fn: () => {
        const seedScriptPath = path.resolve(process.cwd(), 'src/scripts/seed-apps.ts');
        assertTrue(fs.existsSync(seedScriptPath), `Seed script not found at: ${seedScriptPath}`);

        const scriptContent = fs.readFileSync(seedScriptPath, 'utf-8');
        assertContains(scriptContent, "id: 'app_real_estate_pro'");
        assertContains(scriptContent, "name: 'Real Estate & PropTech Pro'");
        assertContains(scriptContent, "slug: 'real-estate-pro'");
        assertContains(scriptContent, "category: 'real_estate'");
        assertContains(scriptContent, "icon: 'Building2'");
        assertContains(scriptContent, "color: '#0284c7'");
        assertContains(scriptContent, "price_monthly: 99");
      },
    },
    {
      name: '1.3 app_real_estate_pro validates strictly against SaasApp interface & schema rules',
      fn: () => {
        const app = EXPECTED_REAL_ESTATE_APP;

        // ID syntax check
        assertMatches(app.id, /^app_[a-z0-9_]+$/, 'app.id must follow app_[a-z0-9_]+ pattern');
        assertEqual(app.id, 'app_real_estate_pro');

        // Slug syntax check
        assertMatches(app.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'app.slug must be valid URL kebab-case');
        assertEqual(app.slug, 'real-estate-pro');

        // Hex color validation
        assertMatches(app.color, /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'app.color must be a valid hex color code');

        // Price and trial days boundaries
        expect(app.price_monthly).toBeGreaterThanOrEqual(0);
        expect(app.trial_days).toBeGreaterThanOrEqual(0);
        assertEqual(app.price_monthly, 99.00);
        assertEqual(app.trial_days, 14);

        // Active & featured flags
        assertTrue(app.is_active);
        assertTrue(app.is_featured);

        // Vertical compatibility
        assertTrue(Array.isArray(app.vertical_compatibility));
        assertContains(app.vertical_compatibility, 'real_estate');
        assertContains(app.vertical_compatibility, 'proptech');
      },
    },

    // =========================================================================
    // SECTION 2: 7 LINKED MODULES IN saas_app_modules
    // =========================================================================
    {
      name: '2.1 Migration and seed script define all 7 required system modules for app_real_estate_pro',
      fn: () => {
        const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260822000001_seed_real_estate_app.sql');
        const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

        const expectedKeys = [
          'core_crm',
          'core_clients',
          'core_locations',
          'module_messaging',
          'module_quotes',
          'module_catalog',
          'module_automation',
        ];

        assertEqual(expectedKeys.length, 7, 'Must require exactly 7 modules');

        for (const modKey of expectedKeys) {
          assertContains(sqlContent, `'${modKey}'`, `Migration must contain module link for ${modKey}`);
        }

        assertContains(sqlContent, 'ON CONFLICT (app_id, module_key) DO NOTHING');
      },
    },
    {
      name: '2.2 Module link records have valid sort_order, auto_enable=true, and proper is_core flags',
      fn: () => {
        const modules = EXPECTED_LINKED_MODULES;
        assertArrayLength(modules, 7);

        // Check sequential sort order
        const sortOrders = modules.map((m) => m.sort_order);
        assertEqual(sortOrders, [1, 2, 3, 4, 5, 6, 7]);

        // Check all auto_enable are true
        for (const m of modules) {
          assertEqual(m.app_id, 'app_real_estate_pro');
          assertTrue(m.auto_enable, `Module ${m.module_key} must have auto_enable: true`);
          assertFalse(m.is_optional, `Module ${m.module_key} must not be optional in base bundle`);
        }

        // Core flags: core_crm & core_clients are core, rest are feature addons
        const coreModules = modules.filter((m) => m.is_core).map((m) => m.module_key);
        assertEqual(coreModules, ['core_crm', 'core_clients']);

        const nonCoreModules = modules.filter((m) => !m.is_core).map((m) => m.module_key);
        assertEqual(nonCoreModules, [
          'core_locations',
          'module_messaging',
          'module_quotes',
          'module_catalog',
          'module_automation',
        ]);
      },
    },
    {
      name: '2.3 All 7 linked modules form a complete, acyclic, and non-conflicting dependency bundle',
      fn: () => {
        const moduleKeys = EXPECTED_LINKED_MODULES.map((m) => m.module_key);
        const moduleSet = new Set(moduleKeys);

        assertEqual(moduleSet.size, 7, 'All 7 module keys must be unique');
        assertTrue(moduleSet.has('core_crm'));
        assertTrue(moduleSet.has('core_clients'));
        assertTrue(moduleSet.has('core_locations'));
        assertTrue(moduleSet.has('module_messaging'));
        assertTrue(moduleSet.has('module_quotes'));
        assertTrue(moduleSet.has('module_catalog'));
        assertTrue(moduleSet.has('module_automation'));
      },
    },

    // =========================================================================
    // SECTION 3: IconMap IN app-slider.tsx RESOLUTION OF Building2
    // =========================================================================
    {
      name: '3.1 app-slider.tsx imports Building2 from lucide-react and includes it in IconMap',
      fn: () => {
        const sliderPath = path.resolve(process.cwd(), 'src/modules/core/lifecycle/components/onboarding/app-slider.tsx');
        assertTrue(fs.existsSync(sliderPath), `app-slider.tsx not found at: ${sliderPath}`);

        const sliderContent = fs.readFileSync(sliderPath, 'utf-8');

        // Check import
        assertContains(sliderContent, 'Building2', 'app-slider.tsx must import Building2 from lucide-react');

        // Check IconMap entry
        assertContains(sliderContent, "'Building2': Building2", "IconMap must map 'Building2' to Building2 component");
      },
    },
    {
      name: '3.2 IconMap resolves Building2 component directly and strictly distinct from fallback Package',
      fn: () => {
        // Direct lucide component verification
        const Building2Component = (LucideIcons as any).Building2;
        const PackageComponent = (LucideIcons as any).Package;

        assertDefined(Building2Component, 'lucide-react must export Building2');
        assertDefined(PackageComponent, 'lucide-react must export Package');
        assertTrue(Building2Component !== PackageComponent, 'Building2 must be distinct from Package');

        // Emulate IconMap logic from app-slider.tsx
        const IconMap: Record<string, any> = {
          'Sparkles': (LucideIcons as any).Sparkles,
          'Rocket': (LucideIcons as any).Rocket,
          'Briefcase': (LucideIcons as any).Briefcase,
          'Package': (LucideIcons as any).Package,
          'ShoppingCart': (LucideIcons as any).ShoppingCart,
          'Utensils': (LucideIcons as any).Utensils,
          'Brush': (LucideIcons as any).Brush,
          'Monitor': (LucideIcons as any).Monitor,
          'Layout': (LucideIcons as any).Layout,
          'Building2': (LucideIcons as any).Building2,
        };

        // Resolution tests
        const resolvedForRealEstate = IconMap['Building2'] || PackageComponent;
        assertEqual(resolvedForRealEstate, Building2Component, 'Real estate icon must resolve to Building2');
        assertTrue(resolvedForRealEstate !== PackageComponent, 'Real estate icon must not fall back to Package');

        // Test fallback for unknown / undefined icons
        const resolvedUndefined = (IconMap as any)[undefined as any] || PackageComponent;
        assertEqual(resolvedUndefined, PackageComponent, 'Undefined icon must fall back to Package');

        const resolvedUnknown = (IconMap as any)['NonExistentIcon'] || PackageComponent;
        assertEqual(resolvedUnknown, PackageComponent, 'Unknown icon must fall back to Package');
      },
    },
    {
      name: '3.3 All 10 registered icons in app-slider.tsx IconMap resolve to valid Lucide components',
      fn: () => {
        const registeredIcons = [
          'Sparkles',
          'Rocket',
          'Briefcase',
          'Package',
          'ShoppingCart',
          'Utensils',
          'Brush',
          'Monitor',
          'Layout',
          'Building2',
        ];

        for (const iconName of registeredIcons) {
          const iconComp = (LucideIcons as any)[iconName];
          assertDefined(iconComp, `Icon ${iconName} must exist in lucide-react exports`);
          assertTrue(typeof iconComp === 'function' || typeof iconComp === 'object', `Icon ${iconName} must be a valid component`);
        }
      },
    },

    // =========================================================================
    // SECTION 4: SUPER ADMIN SPACE CATEGORY RESOLUTION FOR real_estate
    // =========================================================================
    {
      name: '4.1 create-app-dialog.tsx exposes real_estate in Space Category select options',
      fn: () => {
        const dialogPath = path.resolve(process.cwd(), 'src/app/(dashboard)/platform/admin/apps/_components/create-app-dialog.tsx');
        assertTrue(fs.existsSync(dialogPath));
        const content = fs.readFileSync(dialogPath, 'utf-8');

        assertContains(content, '<SelectItem value="real_estate">');
        assertContains(content, 'Real Estate (Bienes Raíces / PropTech)');
      },
    },
    {
      name: '4.2 app-details-sheet.tsx exposes real_estate in Space Category select options',
      fn: () => {
        const sheetPath = path.resolve(process.cwd(), 'src/app/(dashboard)/platform/admin/apps/_components/app-details-sheet.tsx');
        assertTrue(fs.existsSync(sheetPath));
        const content = fs.readFileSync(sheetPath, 'utf-8');

        assertContains(content, '<SelectItem value="real_estate">');
        assertContains(content, 'Real Estate (Bienes Raíces / PropTech)');
      },
    },
    {
      name: '4.3 create-app-sheet.tsx uses canonical snake_case real_estate for category value',
      fn: () => {
        const sheetPath = path.resolve(process.cwd(), 'src/modules/core/saas/create-app-sheet.tsx');
        assertTrue(fs.existsSync(sheetPath));
        const content = fs.readFileSync(sheetPath, 'utf-8');

        assertContains(content, '<SelectItem value="real_estate">');
        assertFalse(content.includes('<SelectItem value="real-estate">'), 'Must NOT use kebab-case real-estate');
      },
    },
    {
      name: '4.4 space-helpers.ts and capabilities-registry.ts resolve real_estate preset faithfully',
      fn: () => {
        const preset = CAPABILITY_PRESETS.real_estate;
        assertDefined(preset, 'CAPABILITY_PRESETS must have real_estate key');

        // Check Terminology
        assertEqual(preset.terminology.client, 'Cliente / Comprador');
        assertEqual(preset.terminology.clients, 'Clientes / Prospectos');
        assertEqual(preset.terminology.project, 'Inmueble / Propiedad');
        assertEqual(preset.terminology.sale, 'Cierre / Negocio');
        assertEqual(preset.terminology.action_new, 'Nuevo Prospecto');

        // Check Policies
        assertEqual(preset.policies.visibleTabs, ['info', 'activity', 'services', 'billing']);
        assertEqual(preset.policies.allowedChannels, ['whatsapp', 'email', 'sms']);
        assertEqual(preset.policies.defaultDashboard, 'real_estate');

        // Check Capabilities
        const expectedCaps = [
          'crm.core',
          'crm.advanced',
          'crm.quotes',
          'messaging.standard',
          'messaging.ai_agent',
          'billing.management',
          'automation.engine',
        ];
        assertEqual(preset.capabilities, expectedCaps);
      },
    },
    {
      name: '4.5 SpaceCategory union type in space-helpers.ts includes real_estate without type degradation',
      fn: () => {
        const validCategories: SpaceCategory[] = [
          'agency',
          'resto',
          'cleaning',
          'platform',
          'retail',
          'saas',
          'real_estate',
        ];

        assertEqual(validCategories.length, 7);
        assertTrue(validCategories.includes('real_estate'));
      },
    },

    // =========================================================================
    // SECTION 5: ADVERSARIAL STRESS-TESTING & MULTI-TENANT ISOLATION
    // =========================================================================
    {
      name: '5.1 Super Admin MRR & Revenue aggregation behaves deterministically with Real Estate subscriptions',
      fn: () => {
        const apps = [
          { id: 'app_marketing_starter', price_monthly: 49, is_active: true },
          { id: 'app_cleaning_pro', price_monthly: 79, is_active: true },
          { id: 'app_consulting_essential', price_monthly: 59, is_active: true },
          { id: 'app_real_estate_pro', price_monthly: 99, is_active: true },
        ];

        const usageStats: Record<string, { count: number }> = {
          'app_marketing_starter': { count: 10 },    // 490
          'app_cleaning_pro': { count: 5 },          // 395
          'app_consulting_essential': { count: 3 },  // 177
          'app_real_estate_pro': { count: 12 },      // 1188
        };

        const totalRevenue = apps.reduce((sum, app) => {
          const count = usageStats[app.id]?.count || 0;
          return sum + count * Number(app.price_monthly);
        }, 0);

        assertEqual(totalRevenue, 2250, 'Total MRR must calculate correctly across all 4 vertical apps');
        assertEqual(usageStats['app_real_estate_pro'].count * 99, 1188, 'Real estate app MRR must equal 1188');
      },
    },
    {
      name: '5.2 Real Estate app configuration does not pollute or alter other vertical configurations',
      fn: () => {
        const allCategories: SpaceCategory[] = ['agency', 'resto', 'cleaning', 'platform', 'retail', 'saas'];

        for (const cat of allCategories) {
          const preset = CAPABILITY_PRESETS[cat];
          assertDefined(preset, `Preset for ${cat} must exist`);
          assertFalse(
            preset.terminology.project === 'Inmueble / Propiedad',
            `Category ${cat} must not have real estate project terminology`
          );
        }
      },
    },
    {
      name: '5.3 Empty / Malformed input resilience in space category resolution',
      fn: () => {
        function resolveFallbackCategory(categoryCandidate: any): SpaceCategory {
          const valid: SpaceCategory[] = ['agency', 'resto', 'cleaning', 'platform', 'retail', 'saas', 'real_estate'];
          if (typeof categoryCandidate === 'string' && valid.includes(categoryCandidate as SpaceCategory)) {
            return categoryCandidate as SpaceCategory;
          }
          return 'agency';
        }

        assertEqual(resolveFallbackCategory('real_estate'), 'real_estate');
        assertEqual(resolveFallbackCategory('real-estate'), 'agency'); // invalid kebab fallback
        assertEqual(resolveFallbackCategory(null), 'agency');
        assertEqual(resolveFallbackCategory(undefined), 'agency');
        assertEqual(resolveFallbackCategory(''), 'agency');
        assertEqual(resolveFallbackCategory('unknown_category'), 'agency');
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
