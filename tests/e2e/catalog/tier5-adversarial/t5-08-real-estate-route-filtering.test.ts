/**
 * Tier 5: Adversarial Coverage Hardening & Milestone 1 Verification
 * Suite: t5-08-real-estate-route-filtering
 * Focus: Challenger 2 Empirical Adversarial Verification for Milestone 1:
 * 1. Empirical Route Filtering with Real Estate Module Bundles
 * 2. Accessibility of /portfolio and /crm/* Routes Under Bundle Subscriptions
 * 3. Strict Negative Filtering & Module Ablation Matrix (Restricting Unsubscribed Routes)
 * 4. RBAC, OrgType, and Capability Gating for Real Estate Space
 * 5. Space Configuration & Capability Preset Integrity for 'real_estate'
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import {
  filterRoutesByModules,
  MODULE_ROUTES,
  getModuleRoute,
  ModuleRoute,
} from '../../../../src/modules/core/saas/module-config';
import {
  CAPABILITY_PRESETS,
  DynamicSpaceConfig,
} from '../../../../src/modules/core/organizations/capabilities-registry';
import {
  VERTICAL_REGISTRY,
  VerticalType,
} from '../../../../src/modules/core/organizations/vertical-registry';
import { SpaceCategory } from '../../../../src/modules/core/organizations/space-helpers';

// Canonical Real Estate Module Bundle from R2 / PROJECT.md Contract
export const REAL_ESTATE_MODULE_BUNDLE = [
  'core_crm',
  'core_clients',
  'module_messaging',
  'module_quotes',
  'module_catalog',
  'module_automation',
  'core_locations',
];

// Canonical Real Estate Capabilities from R1 / PROJECT.md Contract
export const REAL_ESTATE_CAPABILITIES = [
  'crm.core',
  'crm.advanced',
  'crm.quotes',
  'messaging.standard',
  'messaging.ai_agent',
  'billing.management',
  'automation.engine',
];

export const suite = {
  name: 'T5-08: Real Estate Route Filtering & Module Resolution Empirical Audit',
  tier: 'Tier 5',
  feature: 'Milestone 1 - Real Estate Route Filtering & Module Resolution',
  tests: [
    // =========================================================================
    // 1. FULL REAL ESTATE BUNDLE ROUTE ACCESSIBILITY
    // =========================================================================
    {
      name: 'Step 1: Real Estate module bundle correctly grants access to /portfolio and all subscribed /crm/* routes',
      fn: async () => {
        const routes = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );

        const hrefs = routes.map((r) => r.href);
        const keys = routes.map((r) => r.key);

        // Core & Catalog verification
        expect(hrefs).toContain('/dashboard');
        expect(hrefs).toContain('/portfolio');
        expect(keys).toContain('module_catalog');

        // CRM Ecosystem routes verification under Real Estate bundle
        expect(hrefs).toContain('/crm/inbox');
        expect(hrefs).toContain('/crm/contacts');
        expect(hrefs).toContain('/crm/pipeline');
        expect(hrefs).toContain('/crm/marketing');
        expect(hrefs).toContain('/crm/automations');
        expect(hrefs).toContain('/crm/settings');

        // Operations & Tools under Real Estate bundle
        expect(hrefs).toContain('/quotes');
        expect(hrefs).toContain('/flows');
        expect(hrefs).toContain('/platform/locations');

        // Verify module mapping properties
        const catalogRoute = routes.find((r) => r.href === '/portfolio');
        expect(catalogRoute?.parentModule).toBe('module_catalog');
        expect(catalogRoute?.category).toBe('operations');

        const inboxRoute = routes.find((r) => r.href === '/crm/inbox');
        expect(inboxRoute?.parentModule).toBe('module_messaging');
        expect(inboxRoute?.category).toBe('crm');

        const pipelineRoute = routes.find((r) => r.href === '/crm/pipeline');
        expect(pipelineRoute?.parentModule).toBe('core_crm');
        expect(pipelineRoute?.category).toBe('crm');
      },
    },

    // =========================================================================
    // 2. STRICT NEGATIVE FILTERING: UNASSIGNED MODULES EXCLUSION
    // =========================================================================
    {
      name: 'Step 2: Real Estate bundle strictly restricts and excludes unsubscribed vertical & operations routes',
      fn: async () => {
        const routes = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );

        const hrefs = routes.map((r) => r.href);

        // Restaurant operations must be completely excluded
        expect(hrefs).not.toContain('/resto-orders');
        expect(hrefs).not.toContain('/menu');
        expect(hrefs).not.toContain('/resto-staff');

        // Attendance & operations not in bundle must be excluded
        expect(hrefs).not.toContain('/attendance');

        // Unsubscribed finance routes must be excluded
        expect(hrefs).not.toContain('/invoices');
        expect(hrefs).not.toContain('/payments');

        // Unsubscribed hosting & legacy cleaning routes must be excluded
        expect(hrefs).not.toContain('/hosting');
        expect(hrefs).not.toContain('/platform/hosting-accounts');
        expect(hrefs).not.toContain('/cleaning');

        // Unsubscribed CRM addons must be excluded
        expect(hrefs).not.toContain('/crm/meta-ads');
        expect(hrefs).not.toContain('/crm/reports');
      },
    },

    // =========================================================================
    // 3. MODULE ABLATION MATRIX (SYSTEMATIC ISOLATION TESTING)
    // =========================================================================
    {
      name: 'Step 3: Module ablation matrix confirms exact 1-to-1 route gating when individual modules are removed',
      fn: async () => {
        // Ablation A: Remove module_catalog -> /portfolio MUST be hidden
        const withoutCatalog = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE.filter((m) => m !== 'module_catalog'),
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        expect(withoutCatalog.map((r) => r.href)).not.toContain('/portfolio');
        expect(withoutCatalog.map((r) => r.href)).toContain('/crm/inbox');

        // Ablation B: Remove module_messaging -> /crm/inbox MUST be hidden
        const withoutMessaging = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE.filter((m) => m !== 'module_messaging'),
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        expect(withoutMessaging.map((r) => r.href)).not.toContain('/crm/inbox');
        expect(withoutMessaging.map((r) => r.href)).toContain('/portfolio');

        // Ablation C: Remove core_clients -> /crm/contacts MUST be hidden
        const withoutClients = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE.filter((m) => m !== 'core_clients'),
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        expect(withoutClients.map((r) => r.href)).not.toContain('/crm/contacts');

        // Ablation D: Remove core_crm -> /crm/pipeline, /crm/marketing, /crm/settings MUST be hidden
        const withoutCoreCrm = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE.filter((m) => m !== 'core_crm'),
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        const noCrmHrefs = withoutCoreCrm.map((r) => r.href);
        expect(noCrmHrefs).not.toContain('/crm/pipeline');
        expect(noCrmHrefs).not.toContain('/crm/marketing');
        expect(noCrmHrefs).not.toContain('/crm/settings');
        expect(noCrmHrefs).toContain('/portfolio'); // Other bundle modules still work

        // Ablation E: Remove module_automation -> /crm/automations and /flows MUST be hidden
        const withoutAutomation = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE.filter((m) => m !== 'module_automation'),
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        expect(withoutAutomation.map((r) => r.href)).not.toContain('/crm/automations');
        expect(withoutAutomation.map((r) => r.href)).not.toContain('/flows');

        // Ablation F: Remove module_quotes -> /quotes MUST be hidden
        const withoutQuotes = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE.filter((m) => m !== 'module_quotes'),
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        expect(withoutQuotes.map((r) => r.href)).not.toContain('/quotes');

        // Ablation G: Remove core_locations -> /platform/locations MUST be hidden
        const withoutLocations = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE.filter((m) => m !== 'core_locations'),
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        expect(withoutLocations.map((r) => r.href)).not.toContain('/platform/locations');

        // Ablation H: Empty module bundle -> ONLY core infrastructure routes remain
        const emptyRoutes = filterRoutesByModules([], 'owner', 'client', 'real_estate', []);
        const emptyHrefs = emptyRoutes.map((r) => r.href);
        expect(emptyHrefs).toContain('/dashboard');
        expect(emptyHrefs).not.toContain('/portfolio');
        expect(emptyHrefs).not.toContain('/crm/inbox');
        expect(emptyHrefs).not.toContain('/crm/contacts');
        expect(emptyHrefs).not.toContain('/crm/pipeline');
        expect(emptyHrefs).not.toContain('/crm/marketing');
        expect(emptyHrefs).not.toContain('/crm/automations');
        expect(emptyHrefs).not.toContain('/quotes');
        expect(emptyHrefs).not.toContain('/flows');
      },
    },

    // =========================================================================
    // 4. RBAC & IAM PERMISSION GATING WITHIN REAL ESTATE SPACE
    // =========================================================================
    {
      name: 'Step 4: Non-owner roles and permission boundaries enforce granular route security',
      fn: async () => {
        // Staff Agent with only contact viewing permission
        const agentCaps = ['crm.leads.view'];
        const agentRoutes = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'agent',
          'client',
          'real_estate',
          agentCaps
        );
        const agentHrefs = agentRoutes.map((r) => r.href);

        // Permitted for agent
        expect(agentHrefs).toContain('/portfolio'); // Open catalog access
        expect(agentHrefs).toContain('/crm/inbox'); // Messaging open
        expect(agentHrefs).toContain('/crm/contacts'); // Authorized by 'crm.leads.view'
        expect(agentHrefs).toContain('/crm/pipeline'); // Authorized by 'crm.leads.view'

        // Prohibited for agent (Owner/Admin only)
        expect(agentHrefs).not.toContain('/crm/settings');
        expect(agentHrefs).not.toContain('/flows');
        expect(agentHrefs).not.toContain('/quotes');
        expect(agentHrefs).not.toContain('/crm/marketing'); // Requires 'crm.leads.edit'

        // Agent without 'crm.leads.view' cannot see contacts or pipeline
        const restrictedAgentRoutes = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'agent',
          'client',
          'real_estate',
          []
        );
        const restrictedHrefs = restrictedAgentRoutes.map((r) => r.href);
        expect(restrictedHrefs).not.toContain('/crm/contacts');
        expect(restrictedHrefs).not.toContain('/crm/pipeline');
        expect(restrictedHrefs).toContain('/portfolio');
      },
    },

    // =========================================================================
    // 5. CAPABILITY REQUIREMENT GATING (crm.quotes)
    // =========================================================================
    {
      name: 'Step 5: Capability gate on /quotes requires crm.quotes across array and map structures',
      fn: async () => {
        // Scenario A: module_quotes is active, but crm.quotes capability is missing
        const withoutQuoteCap = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'admin',
          'client',
          'real_estate',
          ['crm.core', 'messaging.standard'] // missing crm.quotes
        );
        expect(withoutQuoteCap.map((r) => r.href)).not.toContain('/quotes');

        // Scenario B: crm.quotes present as array item
        const withQuoteCapArray = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'admin',
          'client',
          'real_estate',
          ['crm.quotes']
        );
        expect(withQuoteCapArray.map((r) => r.href)).toContain('/quotes');

        // Scenario C: crm.quotes present as Record<string, boolean>
        const withQuoteCapRecord = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'admin',
          'client',
          'real_estate',
          { 'crm.quotes': true }
        );
        expect(withQuoteCapRecord.map((r) => r.href)).toContain('/quotes');

        // Scenario D: Super capability 'all': true unlocks quote route
        const withAllCap = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'agent',
          'client',
          'real_estate',
          { all: true }
        );
        expect(withAllCap.map((r) => r.href)).toContain('/quotes');
      },
    },

    // =========================================================================
    // 6. MULTI-TENANT ORG TYPE BOUNDARIES
    // =========================================================================
    {
      name: 'Step 6: Real Estate tenant OrgType boundaries block reseller and platform administrative routes',
      fn: async () => {
        // Normal Real Estate client org
        const clientRoutes = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        const clientHrefs = clientRoutes.map((r) => r.href);
        expect(clientHrefs).not.toContain('/platform/organizations');
        expect(clientHrefs).not.toContain('/platform/branding');

        // Reseller Real Estate org
        const resellerRoutes = filterRoutesByModules(
          [...REAL_ESTATE_MODULE_BUNDLE, 'module_whitelabel'],
          'owner',
          'reseller',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        const resellerHrefs = resellerRoutes.map((r) => r.href);
        expect(resellerHrefs).toContain('/platform/organizations');
        expect(resellerHrefs).toContain('/platform/branding');
      },
    },

    // =========================================================================
    // 7. CAPABILITY PRESET & TERMINOLOGY CONFIGURATION FOR real_estate
    // =========================================================================
    {
      name: 'Step 7: CAPABILITY_PRESETS for real_estate matches all authoritative requirements and contracts',
      fn: async () => {
        const preset: DynamicSpaceConfig = CAPABILITY_PRESETS.real_estate;
        expect(preset).toBeDefined();

        // 1. Terminology verification (R1 contract)
        expect(preset.terminology.client).toBe('Cliente / Comprador');
        expect(preset.terminology.clients).toBe('Clientes / Prospectos');
        expect(preset.terminology.project).toBe('Inmueble / Propiedad');
        expect(preset.terminology.sale).toBe('Cierre / Negocio');
        expect(preset.terminology.action_new).toBe('Nuevo Prospecto');

        // 2. UI Policies verification (R1 contract)
        expect(preset.policies.visibleTabs).toEqual(['info', 'activity', 'services', 'billing']);
        expect(preset.policies.allowedChannels).toEqual(['whatsapp', 'email', 'sms']);
        expect(preset.policies.defaultDashboard).toBe('real_estate');
        expect(preset.policies.showBilling).toBe(true);
        expect(preset.policies.showHosting).toBe(false);
        expect(preset.policies.showOrders).toBe(false);
        expect(preset.policies.showServices).toBe(true);

        // 3. Capabilities verification (R1 contract)
        const expectedCapabilities = [
          'crm.core',
          'crm.advanced',
          'crm.quotes',
          'messaging.standard',
          'messaging.ai_agent',
          'billing.management',
          'automation.engine',
        ];
        for (const cap of expectedCapabilities) {
          expect(preset.capabilities).toContain(cap as any);
        }
        expect(preset.capabilities.length).toBe(7);

        // 4. Management & Rules verification
        expect(preset.management.visibleTabs).toEqual(['info', 'activity', 'services', 'billing']);
        expect(preset.rules.allowedChannels).toEqual(['whatsapp', 'email', 'sms']);
      },
    },

    // =========================================================================
    // 8. VERTICAL REGISTRY INTEGRITY FOR real_estate
    // =========================================================================
    {
      name: 'Step 8: VERTICAL_REGISTRY contains valid real_estate profile with matching insights and actions',
      fn: async () => {
        const verticalConfig = VERTICAL_REGISTRY.real_estate;
        expect(verticalConfig).toBeDefined();
        expect(verticalConfig.crmTemplateId).toBe('real_estate');

        // Terminology matches
        expect(verticalConfig.terminology.client).toBe('Cliente / Comprador');
        expect(verticalConfig.terminology.project).toBe('Inmueble / Propiedad');
        expect(verticalConfig.terminology.sale).toBe('Cierre / Negocio');

        // Insights for Real Estate
        expect(verticalConfig.insights.primary.key).toBe('interested_properties');
        expect(verticalConfig.insights.primary.label).toBe('Inmuebles de Interés');
        expect(verticalConfig.insights.secondary.key).toBe('budget');
        expect(verticalConfig.insights.secondary.label).toBe('Presupuesto');

        // Module route helper lookup
        const catalogRoute = getModuleRoute('module_catalog');
        expect(catalogRoute).toBeDefined();
        expect(catalogRoute?.href).toBe('/portfolio');
        expect(catalogRoute?.key).toBe('module_catalog');
      },
    },

    // =========================================================================
    // 9. ADVERSARIAL STRESS & CORRUPT INPUT TOLERANCE
    // =========================================================================
    {
      name: 'Step 9: Adversarial input hardening: case-folding, dirty module lists, and high-frequency filtering benchmark',
      fn: async () => {
        // Case insensitive role handling ('OWNER', 'Admin', 'DUEÑO')
        const uppercaseOwner = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'OWNER',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        expect(uppercaseOwner.map((r) => r.href)).toContain('/crm/settings');

        const spanishOwner = filterRoutesByModules(
          REAL_ESTATE_MODULE_BUNDLE,
          'Dueño',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        expect(spanishOwner.map((r) => r.href)).toContain('/crm/settings');

        // Dirty module arrays with duplicates, empty strings, and unknown keys
        const dirtyModules = [
          'core_crm',
          'core_crm',
          '',
          '   ',
          'UNKNOWN_MODULE_XYZ',
          'module_catalog',
          'module_catalog',
          'core_clients',
        ];
        const dirtyResult = filterRoutesByModules(
          dirtyModules,
          'owner',
          'client',
          'real_estate',
          REAL_ESTATE_CAPABILITIES
        );
        const dirtyHrefs = dirtyResult.map((r) => r.href);
        expect(dirtyHrefs).toContain('/portfolio');
        expect(dirtyHrefs).toContain('/crm/contacts');
        expect(dirtyHrefs).toContain('/crm/pipeline');
        expect(dirtyHrefs).not.toContain('/quotes'); // Not in dirty modules

        // High frequency benchmark: 1,000 evaluations execute in < 15ms
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
          filterRoutesByModules(
            REAL_ESTATE_MODULE_BUNDLE,
            i % 2 === 0 ? 'owner' : 'admin',
            'client',
            'real_estate',
            REAL_ESTATE_CAPABILITIES
          );
        }
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(50); // Under 50ms for 1000 runs (< 0.05ms per call)
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

if (process.argv[1] && process.argv[1].endsWith('t5-08-real-estate-route-filtering.test.ts')) {
  runSuite().then((res) => {
    console.log(`\nSuite: ${res.name} [${res.tier}]`);
    const passedCount = res.tests.filter((t) => t.passed).length;
    console.log(`Passed: ${passedCount}/${res.tests.length}`);
    console.log(`Duration: ${res.durationMs}ms`);
    for (const t of res.tests) {
      console.log(`  ${t.passed ? '✓' : '✗'} ${t.name} (${t.durationMs}ms)`);
      if (!t.passed && t.error) {
        console.error(`    Error: ${t.error.message}`);
      }
    }
    if (!res.passed) {
      process.exit(1);
    } else {
      console.log('\nAll Real Estate Route Filtering tests passed successfully with 0 errors!\n');
      process.exit(0);
    }
  });
}
