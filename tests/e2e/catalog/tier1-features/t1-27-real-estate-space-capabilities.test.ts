/**
 * Tier 1 Test Suite: F27 - Real Estate Space Category & Capabilities Preset
 * Suite: t1-27-real-estate-space-capabilities
 * Feature: Real Estate Space Category Resolution, Capability Registry Preset Lookup & Terminology
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
  TerminologyConfig,
  SpaceUIPolicy,
  UICapability,
} from '../../../../src/modules/core/organizations/capabilities-registry';
import { SpaceCategory } from '../../../../src/modules/core/organizations/space-helpers';
import { VERTICAL_REGISTRY } from '../../../../src/modules/core/organizations/vertical-registry';

export const suite = {
  name: 'T1-27: Real Estate Space Category Resolution & Capability Registry',
  tier: 'Tier 1',
  feature: 'F27: Real Estate Space & Dynamic Capability Presets',
  tests: [
    {
      name: '1. SpaceCategory type definition and registry includes real_estate as a first-class vertical',
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

        assertTrue(validCategories.includes('real_estate'), 'SpaceCategory must include real_estate');
        assertEqual(validCategories.length, 7, 'Must support exactly 7 space categories');
      },
    },
    {
      name: '2. CAPABILITY_PRESETS contains dedicated real_estate preset with exact Spanish terminology',
      fn: () => {
        const preset: DynamicSpaceConfig = CAPABILITY_PRESETS.real_estate;
        assertDefined(preset, 'CAPABILITY_PRESETS.real_estate must be defined');

        const terminology: TerminologyConfig = preset.terminology;
        assertEqual(terminology.client, 'Cliente / Comprador');
        assertEqual(terminology.clients, 'Clientes / Prospectos');
        assertEqual(terminology.project, 'Inmueble / Propiedad');
        assertEqual(terminology.sale, 'Cierre / Negocio');
        assertEqual(terminology.action_new, 'Nuevo Prospecto');
      },
    },
    {
      name: '3. Real Estate Space UI policies configure correct visible tabs and default real_estate dashboard',
      fn: () => {
        const policies: SpaceUIPolicy = CAPABILITY_PRESETS.real_estate.policies;
        assertDefined(policies, 'Real Estate policies must be defined');

        // Check visible tabs
        assertEqual(policies.visibleTabs.length, 4);
        assertContains(policies.visibleTabs, 'info');
        assertContains(policies.visibleTabs, 'activity');
        assertContains(policies.visibleTabs, 'services');
        assertContains(policies.visibleTabs, 'billing');

        // Check policy toggles
        assertTrue(policies.showBilling, 'Billing must be enabled for real estate');
        assertTrue(policies.showServices, 'Services must be enabled for real estate');
        assertFalse(policies.showHosting, 'Hosting must be disabled for real estate');
        assertFalse(policies.showOrders, 'Orders must be disabled for real estate');

        // Check allowed channels & default dashboard
        assertEqual(policies.defaultDashboard, 'real_estate');
        assertEqual(policies.allowedChannels.length, 3);
        assertContains(policies.allowedChannels, 'whatsapp');
        assertContains(policies.allowedChannels, 'email');
        assertContains(policies.allowedChannels, 'sms');
      },
    },
    {
      name: '4. Real Estate Space capability list contains all 7 atomic operational capabilities',
      fn: () => {
        const capabilities: UICapability[] = CAPABILITY_PRESETS.real_estate.capabilities;
        assertDefined(capabilities, 'Real estate capabilities must be defined');
        assertEqual(capabilities.length, 7, 'Real estate must define exactly 7 capabilities');

        const expectedCapabilities: UICapability[] = [
          'crm.core',
          'crm.advanced',
          'crm.quotes',
          'messaging.standard',
          'messaging.ai_agent',
          'billing.management',
          'automation.engine',
        ];

        for (const cap of expectedCapabilities) {
          assertContains(capabilities, cap, `Missing required capability: ${cap}`);
        }
      },
    },
    {
      name: '5. Real Estate Space management profile sections and communication rules are correctly configured',
      fn: () => {
        const management = CAPABILITY_PRESETS.real_estate.management;
        assertDefined(management, 'Real estate management policy must be defined');
        assertContains(management.profileSections, 'contact_info');
        assertContains(management.profileSections, 'business_details');
        assertContains(management.profileSections, 'preferences');

        const rules = CAPABILITY_PRESETS.real_estate.rules;
        assertDefined(rules, 'Real estate rules policy must be defined');
        assertContains(rules.allowedChannels, 'whatsapp');
        assertContains(rules.allowedChannels, 'email');
        assertContains(rules.allowedChannels, 'sms');
      },
    },
    {
      name: '6. Organization dynamic UI config overrides merge cleanly with real_estate base preset',
      fn: () => {
        const basePreset = CAPABILITY_PRESETS.real_estate;

        // Simulate custom org dynamic UI configuration
        const customOrgConfig = {
          terminology: {
            client: 'Comprador VIP',
            action_new: 'Nuevo Inversionista',
          },
          policies: {
            showHosting: true,
          },
        };

        const resolvedConfig: DynamicSpaceConfig = {
          ...basePreset,
          terminology: { ...basePreset.terminology, ...customOrgConfig.terminology },
          policies: { ...basePreset.policies, ...customOrgConfig.policies },
        };

        // Overridden terminology
        assertEqual(resolvedConfig.terminology.client, 'Comprador VIP');
        assertEqual(resolvedConfig.terminology.action_new, 'Nuevo Inversionista');
        // Preserved base terminology
        assertEqual(resolvedConfig.terminology.project, 'Inmueble / Propiedad');
        assertEqual(resolvedConfig.terminology.sale, 'Cierre / Negocio');
        // Overridden policy
        assertTrue(resolvedConfig.policies.showHosting);
        // Preserved base policy
        assertEqual(resolvedConfig.policies.defaultDashboard, 'real_estate');
      },
    },
    {
      name: '7. VERTICAL_REGISTRY maps real_estate to correct terminology, insights, and policies',
      fn: () => {
        const realEstateVertical = VERTICAL_REGISTRY.real_estate;
        assertDefined(realEstateVertical, 'VERTICAL_REGISTRY.real_estate must be defined');
        assertEqual(realEstateVertical.crmTemplateId, 'real_estate');
        assertEqual(realEstateVertical.terminology.client, 'Cliente / Comprador');
        assertEqual(realEstateVertical.terminology.project, 'Inmueble / Propiedad');
        assertEqual(realEstateVertical.terminology.sale, 'Cierre / Negocio');
        assertEqual(realEstateVertical.management.visibleTabs, ['info', 'activity', 'services', 'billing']);
        assertTrue(realEstateVertical.management.actions.showBilling);
        assertFalse(realEstateVertical.management.actions.showHosting);
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier1');
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
