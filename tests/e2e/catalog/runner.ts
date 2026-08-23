#!/usr/bin/env tsx
/**
 * Main E2E Test Runner & Reporter
 * Universal Multi-Industry Catalog & Premium Storefront Portal
 * Pixy Platform
 *
 * Resilient Dynamic Discovery & Execution Architecture:
 * - Dynamic asynchronous module loading across all 5 Tiers (Tier 1-5).
 * - Zero silent error swallowing: module load failures generate synthetic failed test suites.
 * - Comprehensive support for 'suite' objects, 'suites' arrays, and 'runSuite'/'run' functions.
 * - Deterministic alphabetical execution order per tier.
 * - High-resolution duration timing & per-suite assertion delta tracking.
 * - ANSI-formatted summary matrix & strict non-zero exit codes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { getAssertionCount, resetAssertionCount } from './harness/assertions';

// Load environment variables for full database and backend mocking
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-e2e.pixy.internal';
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-for-e2e-testing';
}

// Resolve __dirname in ESM / TSX environments
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

export interface ExecutableSuite {
  name: string;
  tier: string;
  feature?: string;
  filePath: string;
  tests: TestCase[];
}

export interface TestResult {
  suiteName: string;
  tier: string;
  feature: string;
  filePath: string;
  totalTests: number;
  passed: number;
  failed: number;
  assertions: number;
  durationMs: number;
  errors: Array<{ testName: string; error: string; stack?: string }>;
}

export interface TierConfig {
  id: string;
  name: string;
  dirName: string;
  minExpectedSuites: number;
  expectedPrefix: string;
}

export const TIER_CONFIGS: TierConfig[] = [
  {
    id: 'tier1',
    name: 'Tier 1',
    dirName: 'tier1-features',
    minExpectedSuites: 26,
    expectedPrefix: 't1-',
  },
  {
    id: 'tier2',
    name: 'Tier 2',
    dirName: 'tier2-boundaries',
    minExpectedSuites: 26,
    expectedPrefix: 't2-',
  },
  {
    id: 'tier3',
    name: 'Tier 3',
    dirName: 'tier3-pairwise',
    minExpectedSuites: 10,
    expectedPrefix: 't3-',
  },
  {
    id: 'tier4',
    name: 'Tier 4',
    dirName: 'tier4-scenarios',
    minExpectedSuites: 13,
    expectedPrefix: 't4-',
  },
  {
    id: 'tier5',
    name: 'Tier 5',
    dirName: 'tier5-adversarial',
    minExpectedSuites: 5,
    expectedPrefix: 't5-',
  },
];

/**
 * Dynamically discovers and loads test suites for all tiers.
 * Any import, syntax, or initialization error is caught and converted
 * into a failing synthetic test suite to ensure visibility and non-zero exit code.
 */
export async function discoverAllSuites(baseDir: string = __dirname): Promise<{
  suites: ExecutableSuite[];
  loadErrorsCount: number;
}> {
  const discoveredSuites: ExecutableSuite[] = [];
  let loadErrorsCount = 0;

  for (const tierConfig of TIER_CONFIGS) {
    const fullDirPath = path.join(baseDir, tierConfig.dirName);

    if (!fs.existsSync(fullDirPath)) {
      loadErrorsCount++;
      discoveredSuites.push({
        name: `SYNTHETIC-MISSING-DIR: ${tierConfig.dirName}`,
        tier: tierConfig.name,
        feature: `Directory Integrity (${tierConfig.dirName})`,
        filePath: fullDirPath,
        tests: [
          {
            name: `Tier directory ${tierConfig.dirName} exists`,
            fn: () => {
              throw new Error(`Required test directory does not exist: ${fullDirPath}`);
            },
          },
        ],
      });
      continue;
    }

    const testFiles = fs
      .readdirSync(fullDirPath)
      .filter(
        (f) =>
          (f.endsWith('.test.ts') ||
            f.endsWith('.test.js') ||
            f.endsWith('.e2e.ts') ||
            f.endsWith('.e2e.js') ||
            f.endsWith('.spec.ts') ||
            f.endsWith('.spec.js')) &&
          !f.endsWith('.d.ts')
      )
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    for (const file of testFiles) {
      const fullFilePath = path.join(fullDirPath, file);

      try {
        const mod = await import(pathToFileURL(fullFilePath).href);

        if (mod.suite && Array.isArray(mod.suite.tests)) {
          // Standard suite export
          discoveredSuites.push({
            name: mod.suite.name || path.basename(file, path.extname(file)),
            tier: mod.suite.tier || tierConfig.name,
            feature: mod.suite.feature || `Feature (${file})`,
            filePath: fullFilePath,
            tests: mod.suite.tests,
          });
        } else if (Array.isArray(mod.suites)) {
          // Multiple suites exported as array
          for (const s of mod.suites) {
            if (s && Array.isArray(s.tests)) {
              discoveredSuites.push({
                name: s.name || path.basename(file, path.extname(file)),
                tier: s.tier || tierConfig.name,
                feature: s.feature || `Feature (${file})`,
                filePath: fullFilePath,
                tests: s.tests,
              });
            }
          }
        } else if (typeof mod.runSuite === 'function' || typeof mod.run === 'function') {
          // Module exports custom runSuite() or run() function
          const runnerFn = typeof mod.runSuite === 'function' ? mod.runSuite : mod.run;
          discoveredSuites.push({
            name: path.basename(file, path.extname(file)),
            tier: tierConfig.name,
            feature: `Scenario Runner (${file})`,
            filePath: fullFilePath,
            tests: [
              {
                name: `Execute ${path.basename(file, path.extname(file))} via custom runner`,
                fn: async () => {
                  const res = await runnerFn();
                  if (res && res.passed === false) {
                    const failed = res.tests?.filter((t: any) => !t.passed) || [];
                    const msg = failed.map((t: any) => `${t.name}: ${t.error?.message || t.error}`).join('; ');
                    throw new Error(msg || (res.errors ? res.errors.join('; ') : 'Custom test runner reported failure'));
                  }
                },
              },
            ],
          });
        } else {
          // Module loaded but did not export recognized suite structure
          loadErrorsCount++;
          discoveredSuites.push({
            name: `SYNTHETIC-EXPORT-FAIL: ${file}`,
            tier: tierConfig.name,
            feature: `Module Export (${file})`,
            filePath: fullFilePath,
            tests: [
              {
                name: `Module ${file} exports valid 'suite' object or 'runSuite' function`,
                fn: () => {
                  throw new Error(
                    `Test module ${file} does not export a recognized 'suite' object (with .tests array) or 'runSuite()' function.`
                  );
                },
              },
            ],
          });
        }
      } catch (err: any) {
        // Module load, compilation, or evaluation failure
        loadErrorsCount++;
        discoveredSuites.push({
          name: `SYNTHETIC-LOAD-FAIL: ${file}`,
          tier: tierConfig.name,
          feature: `Module Loading (${file})`,
          filePath: fullFilePath,
          tests: [
            {
              name: `Module Load & Compilation: ${file}`,
              fn: () => {
                throw new Error(
                  `Failed to load/evaluate test module '${file}':\n${err?.stack || err?.message || String(err)}`
                );
              },
            },
          ],
        });
      }
    }
  }

  return { suites: discoveredSuites, loadErrorsCount };
}

/**
 * Executes a single test suite, recording timing, assertion deltas, and errors.
 */
export async function executeSuite(suite: ExecutableSuite): Promise<TestResult> {
  const startTime = performance.now();
  const initialAssertions = getAssertionCount();

  let passed = 0;
  let failed = 0;
  const errors: Array<{ testName: string; error: string; stack?: string }> = [];

  for (const testCase of suite.tests) {
    try {
      await testCase.fn();
      passed++;
    } catch (err: any) {
      failed++;
      errors.push({
        testName: testCase.name,
        error: err?.message || String(err),
        stack: err?.stack,
      });
    }
  }

  const durationMs = Math.round(performance.now() - startTime);
  const suiteAssertions = getAssertionCount() - initialAssertions;

  return {
    suiteName: suite.name,
    tier: suite.tier,
    feature: suite.feature || suite.name,
    filePath: suite.filePath,
    totalTests: suite.tests.length,
    passed,
    failed,
    assertions: suiteAssertions,
    durationMs,
    errors,
  };
}

/**
 * Main entry point for test runner CLI
 */
export async function main(): Promise<void> {
  console.log('\n' + '='.repeat(100));
  console.log('  PIXY UNIVERSAL CATALOG & PREMIUM STOREFRONT PORTAL — E2E TEST RUNNER');
  console.log('='.repeat(100));
  console.log(`  Environment: Node.js ${process.version} | Platform: ${process.platform}`);
  console.log(`  Timestamp:   ${new Date().toISOString()}`);
  console.log('='.repeat(100) + '\n');

  resetAssertionCount();

  const discoveryStartTime = performance.now();
  const { suites, loadErrorsCount } = await discoverAllSuites(__dirname);
  const discoveryDuration = Math.round(performance.now() - discoveryStartTime);

  console.log(`  Discovered ${suites.length} test suites across 5 Tiers in ${discoveryDuration}ms.`);
  if (loadErrorsCount > 0) {
    console.error(`  \x1b[31m[WARNING] ${loadErrorsCount} suite(s) failed during discovery and recorded as synthetic failures.\x1b[0m`);
  }
  console.log('\n' + '-'.repeat(100));
  console.log('  EXECUTING TEST SUITES');
  console.log('-'.repeat(100));

  const results: TestResult[] = [];
  const totalStartTime = performance.now();

  for (const suite of suites) {
    const res = await executeSuite(suite);
    results.push(res);

    const statusIcon = res.failed === 0 ? '✓' : '✗';
    const statusColor = res.failed === 0 ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';

    console.log(
      `  ${statusColor}${statusIcon}${resetColor} [${res.tier}] ${res.suiteName.padEnd(52)} | ${String(res.passed).padStart(2)}/${String(res.totalTests).padEnd(2)} passed | ${String(res.assertions).padStart(3)} asserts | ${String(res.durationMs).padStart(3)}ms`
    );
  }

  const totalDuration = Math.round(performance.now() - totalStartTime);
  const totalTests = results.reduce((sum, r) => sum + r.totalTests, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalAssertions = getAssertionCount();

  // Tier breakdown
  const tierResults = new Map<string, { suites: number; passed: number; failed: number; tests: number; asserts: number }>();
  for (const r of results) {
    const entry = tierResults.get(r.tier) || { suites: 0, passed: 0, failed: 0, tests: 0, asserts: 0 };
    entry.suites++;
    entry.tests += r.totalTests;
    entry.passed += r.passed;
    entry.failed += r.failed;
    entry.asserts += r.assertions;
    tierResults.set(r.tier, entry);
  }

  console.log('\n' + '-'.repeat(100));
  console.log('  SUMMARY MATRIX & COVERAGE REPORT');
  console.log('-'.repeat(100));
  console.log(
    `  ${'Suite Identifier'.padEnd(54)} | ${'Tier'.padEnd(8)} | ${'Tests'.padEnd(7)} | ${'Asserts'.padEnd(8)} | ${'Duration'.padEnd(8)} | ${'Status'}`
  );
  console.log('-'.repeat(100));

  for (const r of results) {
    const statusText = r.failed === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(
      `  ${r.suiteName.padEnd(54)} | ${r.tier.padEnd(8)} | ${`${r.passed}/${r.totalTests}`.padEnd(7)} | ${String(r.assertions).padEnd(8)} | ${`${r.durationMs}ms`.padEnd(8)} | ${statusText}`
    );
  }

  console.log('='.repeat(100));
  console.log('  TIER BREAKDOWN:');
  for (const [tierName, stats] of tierResults.entries()) {
    const color = stats.failed === 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(
      `  - ${tierName.padEnd(10)}: ${stats.suites} suites | ${stats.passed}/${stats.tests} tests passed | ${stats.asserts} asserts | ${color}${stats.failed === 0 ? 'ALL PASSED' : `${stats.failed} FAILED`}\x1b[0m`
    );
  }

  console.log('='.repeat(100));
  console.log(`  TOTAL SUITES:     ${results.length}`);
  console.log(`  TOTAL TESTS:      ${totalTests}`);
  console.log(`  PASSED:           \x1b[32m${totalPassed}\x1b[0m`);
  console.log(`  FAILED:           ${totalFailed === 0 ? '\x1b[32m0\x1b[0m' : `\x1b[31m${totalFailed}\x1b[0m`}`);
  console.log(`  ASSERTIONS:       ${totalAssertions}`);
  console.log(`  TOTAL TIME:       ${totalDuration} ms`);
  console.log('='.repeat(100));

  // Check thresholds
  const MIN_EXPECTED_SUITES = 80;
  const MIN_EXPECTED_TESTS = 400;
  let thresholdFailure = false;

  if (results.length < MIN_EXPECTED_SUITES) {
    console.error(
      `\n\x1b[31m  [THRESHOLD ERROR] Discovered only ${results.length} suites, minimum required is ${MIN_EXPECTED_SUITES}.\x1b[0m`
    );
    thresholdFailure = true;
  }

  if (totalTests < MIN_EXPECTED_TESTS) {
    console.error(
      `\n\x1b[31m  [THRESHOLD ERROR] Executed only ${totalTests} tests, minimum required is ${MIN_EXPECTED_TESTS}.\x1b[0m`
    );
    thresholdFailure = true;
  }

  if (totalFailed > 0 || thresholdFailure) {
    console.error('\n' + '!'.repeat(100));
    console.error('  FAILURES DETECTED:');
    console.error('!'.repeat(100));
    for (const r of results) {
      if (r.failed > 0) {
        console.error(`\n  Suite: ${r.suiteName} (${r.filePath})`);
        for (const err of r.errors) {
          console.error(`    - Test: ${err.testName}`);
          console.error(`      Error: ${err.error}`);
          if (err.stack) {
            console.error(`      Stack: ${err.stack.split('\n').slice(0, 4).join('\n')}`);
          }
        }
      }
    }
    console.error('\n' + '!'.repeat(100) + '\n');
    process.exit(1);
  } else {
    console.log('\n\x1b[32m  [SUCCESS] 100% E2E Test Suite Passed with 0 Errors.\x1b[0m\n');
    process.exit(0);
  }
}

if (process.argv[1] && (process.argv[1].endsWith('runner.ts') || process.argv[1].endsWith('runner.js'))) {
  main().catch((err) => {
    console.error('Fatal Runner Error:', err);
    process.exit(1);
  });
}
