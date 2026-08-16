#!/usr/bin/env tsx
/**
 * Dedicated Tier 5 Adversarial Test Runner
 * Universal Multi-Industry Catalog & Premium Storefront Portal
 * Pixy Platform
 */

import { runSuite as runT501 } from './tier5-adversarial/t5-01-cartesian-stress.test';
import { runSuite as runT502 } from './tier5-adversarial/t5-02-pricing-oracle-stress.test';
import { runSuite as runT503 } from './tier5-adversarial/t5-03-addon-conflict-stress.test';
import { runSuite as runT504 } from './tier5-adversarial/t5-04-webp-gallery-bounds.test';
import { runSuite as runT505 } from './tier5-adversarial/t5-05-multi-tenant-rls-invariants.test';

export async function runAllTier5Suites(): Promise<{
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalAssertions: number;
  results: any[];
}> {
  console.log('\n' + '='.repeat(100));
  console.log('  PIXY CATALOG — TIER 5 ADVERSARIAL STRESS TEST SUITE RUNNER');
  console.log('='.repeat(100));

  const suiteRunners = [
    { name: 'T5-01: Adversarial Cartesian Combinatorics & Unicode Matrix', fn: runT501 },
    { name: 'T5-02: Pricing Oracle & Floating-Point Precision Hardening', fn: runT502 },
    { name: 'T5-03: Add-on & Upsell Conflict & Boundary Resolution', fn: runT503 },
    { name: 'T5-04: WebP Gallery Bounds & Cover Invariants', fn: runT504 },
    { name: 'T5-05: Multi-Tenant RLS Invariants & Cross-Org Isolation', fn: runT505 },
  ];

  const results: any[] = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalAssertions = 0;
  let passedSuites = 0;
  let failedSuites = 0;

  for (const sr of suiteRunners) {
    const res = await sr.fn();
    results.push(res);
    const totalCount = res.tests.length;
    const passedCount = res.tests.filter((t) => t.passed).length;
    const failedCount = res.tests.filter((t) => !t.passed).length;
    const errorsList = res.tests
      .filter((t) => !t.passed)
      .map((t) => ({ testName: t.name, error: t.error?.message || String(t.error) }));

    totalTests += totalCount;
    totalPassed += passedCount;
    totalFailed += failedCount;

    if (failedCount === 0) {
      passedSuites++;
      console.log(`  \x1b[32m✓\x1b[0m [Tier 5] ${res.name.padEnd(65)} | ${passedCount}/${totalCount} passed | ${res.durationMs}ms`);
    } else {
      failedSuites++;
      console.log(`  \x1b[31m✗\x1b[0m [Tier 5] ${res.name.padEnd(65)} | ${passedCount}/${totalCount} passed | ${res.durationMs}ms`);
      for (const err of errorsList) {
        console.error(`      - Test "${err.testName}": ${err.error}`);
      }
    }
  }

  console.log('='.repeat(100));
  console.log(`  TOTAL TIER 5 SUITES: ${results.length}`);
  console.log(`  PASSED SUITES:       \x1b[32m${passedSuites}\x1b[0m`);
  console.log(`  FAILED SUITES:       ${failedSuites === 0 ? '\x1b[32m0\x1b[0m' : `\x1b[31m${failedSuites}\x1b[0m`}`);
  console.log(`  TOTAL TESTS:        ${totalTests}`);
  console.log(`  PASSED TESTS:       \x1b[32m${totalPassed}\x1b[0m`);
  console.log(`  FAILED TESTS:       ${totalFailed === 0 ? '\x1b[32m0\x1b[0m' : `\x1b[31m${totalFailed}\x1b[0m`}`);
  console.log(`  ASSERTIONS:         ${totalAssertions}`);
  console.log('='.repeat(100) + '\n');

  return {
    totalSuites: results.length,
    passedSuites,
    failedSuites,
    totalTests,
    totalPassed,
    totalFailed,
    totalAssertions,
    results,
  };
}

if (process.argv[1] && (process.argv[1].endsWith('tier5-runner.ts') || process.argv[1].endsWith('tier5-runner.js'))) {
  runAllTier5Suites()
    .then((summary) => {
      if (summary.totalFailed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal Tier 5 Runner Error:', err);
      process.exit(1);
    });
}
