/**
 * ==============================================================================
 * CHALLENGER 1 EMPIRICAL TEST SUITE: MILESTONE 3 VERIFICATION (PART A)
 * File: tests/e2e/catalog/tier5-adversarial/t5-04-m3-provisioning.test.ts
 *
 * Focus: Default Real Estate categories and CRM pipeline initialization
 * ==============================================================================
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { DEFAULT_REAL_ESTATE_CATEGORIES } from '../../../../src/modules/core/organizations/vertical-registry';
import { CRMTemplates } from '../../../../src/modules/features/crm/services/logic/templates-shared';

export const suite = {
  name: 'T5-04b: Real Estate Category Seeding & CRM State Machine Invariants',
  tier: 'Tier 5',
  feature: 'M3 PropTech Seeding & CRM Invariants',
  tests: [
    {
      name: 'Default categories list contains exactly 5 categories with scope: tenant',
      fn: async () => {
        expect(DEFAULT_REAL_ESTATE_CATEGORIES).toBeDefined();
        expect(DEFAULT_REAL_ESTATE_CATEGORIES).toHaveLength(5);
        expect(DEFAULT_REAL_ESTATE_CATEGORIES.every((c) => c.scope === 'tenant')).toBe(true);
      },
    },
    {
      name: 'CRMTemplates.real_estate contains 6 states and 6 pipeline stages',
      fn: async () => {
        expect(CRMTemplates.real_estate).toBeDefined();
        expect(CRMTemplates.real_estate.processStates).toHaveLength(6);
        expect(CRMTemplates.real_estate.pipelineStages).toHaveLength(6);
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
