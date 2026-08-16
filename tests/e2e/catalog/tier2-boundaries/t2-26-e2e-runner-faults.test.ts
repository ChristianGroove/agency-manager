/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-26-e2e-runner-faults
 * Feature: F26 - E2E Requirement-Driven Test Suite Runner
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';

export const suite = {
  name: 'T2-26: E2E Runner Fault Tolerance & Error Handling',
  tier: 'Tier 2',
  feature: 'F26: E2E Requirement-Driven Test Suite',
  tests: [
    {
      name: 'Async assertion failure is captured without crashing runner process',
      fn: async () => {
        const subRegistry = new TestRegistry();
        subRegistry.setSuite('Sub-Test-Failure', 'tier2');
        subRegistry.addTest('Failing async assertion', async () => {
          expect(1 + 1).toBe(3);
        });

        const result = await subRegistry.runSuite();
        expect(result.passed).toBe(false);
        expect(result.tests).toHaveLength(1);
        expect(result.tests[0].passed).toBe(false);
        expect(result.tests[0].error?.message).toContain('Expected 2 to be 3');
      },
    },
    {
      name: 'Unhandled exception inside test is captured in structured result',
      fn: async () => {
        const subRegistry = new TestRegistry();
        subRegistry.setSuite('Sub-Test-Exception', 'tier2');
        subRegistry.addTest('Unhandled runtime throw', async () => {
          throw new Error('Database connection reset during test simulation');
        });

        const result = await subRegistry.runSuite();
        expect(result.passed).toBe(false);
        expect(result.tests[0].error?.message).toBe('Database connection reset during test simulation');
      },
    },
    {
      name: 'Test execution duration in milliseconds is measured accurately',
      fn: async () => {
        const subRegistry = new TestRegistry();
        subRegistry.setSuite('Sub-Test-Duration', 'tier2');
        subRegistry.addTest('Delay test', async () => {
          await new Promise((resolve) => setTimeout(resolve, 15));
        });

        const result = await subRegistry.runSuite();
        expect(result.passed).toBe(true);
        expect(result.durationMs).toBeGreaterThanOrEqual(10);
        expect(result.tests[0].durationMs).toBeGreaterThanOrEqual(10);
      },
    },
    {
      name: 'Structured error stack is preserved for diagnosis',
      fn: async () => {
        const subRegistry = new TestRegistry();
        subRegistry.setSuite('Sub-Test-Stack', 'tier2');
        subRegistry.addTest('Stack test', async () => {
          throw new Error('Deep failure');
        });

        const result = await subRegistry.runSuite();
        expect(result.tests[0].error?.stack).toBeDefined();
        expect(result.tests[0].error?.stack).toContain('Deep failure');
      },
    },
    {
      name: 'Determines exit code 1 when at least one suite in batch fails',
      fn: async () => {
        const evaluateExitCode = (suites: Array<{ passed: boolean }>): number => {
          const allPassed = suites.every((s) => s.passed);
          return allPassed ? 0 : 1;
        };

        expect(evaluateExitCode([{ passed: true }, { passed: true }])).toBe(0);
        expect(evaluateExitCode([{ passed: true }, { passed: false }])).toBe(1);
        expect(evaluateExitCode([{ passed: false }])).toBe(1);
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
