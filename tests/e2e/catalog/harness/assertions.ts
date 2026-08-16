/**
 * Universal Multi-Industry Catalog & Premium Storefront Portal
 * E2E Test Harness - Unified Assertion Library
 */

let totalAssertions = 0;

export function resetAssertionCount(): void {
  totalAssertions = 0;
}

export function getAssertionCount(): number {
  return totalAssertions;
}

export class AssertionError extends Error {
  constructor(message: string, public actual?: any, public expected?: any) {
    super(message);
    this.name = 'AssertionError';
  }
}

function formatValue(v: any): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// Tier 1 Assertion API
// -------------------------------------------------------------

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  totalAssertions++;
  if (!deepEqual(actual, expected)) {
    throw new AssertionError(
      message || `Expected ${formatValue(actual)} to equal ${formatValue(expected)}`,
      actual,
      expected
    );
  }
}

export function assertTrue(actual: any, message?: string): void {
  totalAssertions++;
  if (!actual) {
    throw new AssertionError(
      message || `Expected truthy value, got ${formatValue(actual)}`,
      actual,
      true
    );
  }
}

export function assertFalse(actual: any, message?: string): void {
  totalAssertions++;
  if (actual) {
    throw new AssertionError(
      message || `Expected falsy value, got ${formatValue(actual)}`,
      actual,
      false
    );
  }
}

export function assertDeepEqual(actual: any, expected: any, message?: string): void {
  totalAssertions++;
  if (!deepEqual(actual, expected)) {
    throw new AssertionError(
      message || `Expected deep equality between ${formatValue(actual)} and ${formatValue(expected)}`,
      actual,
      expected
    );
  }
}

export function assertThrows(
  fn: () => any,
  expectedError?: string | RegExp,
  message?: string
): void {
  totalAssertions++;
  let thrown: any = null;
  try {
    fn();
  } catch (err: any) {
    thrown = err;
  }

  if (!thrown) {
    throw new AssertionError(message || 'Expected function to throw an error, but it did not throw.');
  }

  if (expectedError) {
    const errMessage = thrown?.message || String(thrown);
    if (typeof expectedError === 'string') {
      if (!errMessage.includes(expectedError)) {
        throw new AssertionError(
          message || `Expected error message to contain "${expectedError}", but got "${errMessage}"`,
          errMessage,
          expectedError
        );
      }
    } else if (expectedError instanceof RegExp) {
      if (!expectedError.test(errMessage)) {
        throw new AssertionError(
          message || `Expected error message "${errMessage}" to match pattern ${expectedError}`,
          errMessage,
          expectedError
        );
      }
    }
  }
}

export async function assertAsyncThrows(
  asyncFn: () => Promise<any>,
  expectedError?: string | RegExp,
  message?: string
): Promise<void> {
  totalAssertions++;
  let thrown: any = null;
  try {
    await asyncFn();
  } catch (err: any) {
    thrown = err;
  }

  if (!thrown) {
    throw new AssertionError(message || 'Expected async function to throw/reject, but it resolved successfully.');
  }

  if (expectedError) {
    const errMessage = thrown?.message || String(thrown);
    if (typeof expectedError === 'string') {
      if (!errMessage.includes(expectedError)) {
        throw new AssertionError(
          message || `Expected rejected error message to contain "${expectedError}", but got "${errMessage}"`,
          errMessage,
          expectedError
        );
      }
    } else if (expectedError instanceof RegExp) {
      if (!expectedError.test(errMessage)) {
        throw new AssertionError(
          message || `Expected rejected error message "${errMessage}" to match pattern ${expectedError}`,
          errMessage,
          expectedError
        );
      }
    }
  }
}

export function assertArrayLength(actual: any[], expected: number, message?: string): void {
  totalAssertions++;
  const len = actual?.length;
  if (!Array.isArray(actual) || len !== expected) {
    throw new AssertionError(
      message || `Expected array length to be ${expected}, got ${len}`,
      len,
      expected
    );
  }
}

export function assertGreaterThan(actual: number, expected: number, message?: string): void {
  totalAssertions++;
  if (typeof actual !== 'number' || !(actual > expected)) {
    throw new AssertionError(
      message || `Expected ${actual} to be > ${expected}`,
      actual,
      expected
    );
  }
}

export function assertGreaterThanOrEqual(actual: number, expected: number, message?: string): void {
  totalAssertions++;
  if (typeof actual !== 'number' || !(actual >= expected)) {
    throw new AssertionError(
      message || `Expected ${actual} to be >= ${expected}`,
      actual,
      expected
    );
  }
}

export function assertLessThan(actual: number, expected: number, message?: string): void {
  totalAssertions++;
  if (typeof actual !== 'number' || !(actual < expected)) {
    throw new AssertionError(
      message || `Expected ${actual} to be < ${expected}`,
      actual,
      expected
    );
  }
}

export function assertLessThanOrEqual(actual: number, expected: number, message?: string): void {
  totalAssertions++;
  if (typeof actual !== 'number' || !(actual <= expected)) {
    throw new AssertionError(
      message || `Expected ${actual} to be <= ${expected}`,
      actual,
      expected
    );
  }
}

export function assertInRange(actual: number, min: number, max: number, message?: string): void {
  totalAssertions++;
  if (typeof actual !== 'number' || actual < min || actual > max) {
    throw new AssertionError(
      message || `Expected ${actual} to be in range [${min}, ${max}]`,
      actual,
      `[${min}, ${max}]`
    );
  }
}

export function assertDefined(actual: any, message?: string): void {
  totalAssertions++;
  if (actual === undefined || actual === null) {
    throw new AssertionError(
      message || `Expected value to be defined, got ${formatValue(actual)}`,
      actual,
      'defined'
    );
  }
}

export function assertUndefined(actual: any, message?: string): void {
  totalAssertions++;
  if (actual !== undefined) {
    throw new AssertionError(
      message || `Expected value to be undefined, got ${formatValue(actual)}`,
      actual,
      undefined
    );
  }
}

export function assertNull(actual: any, message?: string): void {
  totalAssertions++;
  if (actual !== null) {
    throw new AssertionError(
      message || `Expected value to be null, got ${formatValue(actual)}`,
      actual,
      null
    );
  }
}

export function assertMatches(actual: string, pattern: RegExp | string, message?: string): void {
  totalAssertions++;
  const reg = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  if (typeof actual !== 'string' || !reg.test(actual)) {
    throw new AssertionError(
      message || `Expected "${actual}" to match pattern ${pattern}`,
      actual,
      pattern
    );
  }
}

export function assertContains(
  haystack: string | any[] | Set<any> | Map<any, any>,
  needle: any,
  message?: string
): void {
  totalAssertions++;
  let pass = false;
  if (typeof haystack === 'string') {
    pass = haystack.includes(String(needle));
  } else if (Array.isArray(haystack)) {
    pass = haystack.some((item) => deepEqual(item, needle));
  } else if (haystack instanceof Set || haystack instanceof Map) {
    pass = haystack.has(needle);
  }

  if (!pass) {
    throw new AssertionError(
      message || `Expected ${formatValue(haystack)} to contain ${formatValue(needle)}`,
      haystack,
      needle
    );
  }
}

export function assertValidUUID(actual: string, message?: string): void {
  totalAssertions++;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof actual !== 'string' || !uuidRegex.test(actual)) {
    throw new AssertionError(
      message || `Expected valid UUID string, got "${actual}"`,
      actual,
      'UUID'
    );
  }
}

// -------------------------------------------------------------
// Tier 2–4 Fluent Expect API
// -------------------------------------------------------------

export interface Matchers<T> {
  toBe(expected: T): void;
  toEqual(expected: any): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toContain(expected: any): void;
  toMatch(pattern: RegExp | string): void;
  toThrow(expectedError?: string | RegExp): void;
  toHaveLength(expected: number): void;
  toBeCloseTo(expected: number, precision?: number): void;
  not: Matchers<T>;
}

export function expect<T = any>(actual: T): Matchers<T> {
  const createMatchers = (isNot: boolean): Matchers<T> => ({
    toBe(expected: T) {
      totalAssertions++;
      const pass = actual === expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to be' : 'to be'} ${formatValue(expected)}`,
          actual,
          expected
        );
      }
    },
    toEqual(expected: any) {
      totalAssertions++;
      const pass = deepEqual(actual, expected);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to equal' : 'to equal'} ${formatValue(expected)}`,
          actual,
          expected
        );
      }
    },
    toBeTruthy() {
      totalAssertions++;
      const pass = Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to be truthy' : 'to be truthy'}`,
          actual,
          true
        );
      }
    },
    toBeFalsy() {
      totalAssertions++;
      const pass = !actual;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to be falsy' : 'to be falsy'}`,
          actual,
          false
        );
      }
    },
    toBeNull() {
      totalAssertions++;
      const pass = actual === null;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to be null' : 'to be null'}`,
          actual,
          null
        );
      }
    },
    toBeUndefined() {
      totalAssertions++;
      const pass = actual === undefined;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to be undefined' : 'to be undefined'}`,
          actual,
          undefined
        );
      }
    },
    toBeDefined() {
      totalAssertions++;
      const pass = actual !== undefined && actual !== null;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to be defined' : 'to be defined'}`,
          actual,
          'defined'
        );
      }
    },
    toBeGreaterThan(expected: number) {
      totalAssertions++;
      const pass = typeof actual === 'number' && actual > expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to be >' : 'to be >'} ${expected}`,
          actual,
          expected
        );
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      totalAssertions++;
      const pass = typeof actual === 'number' && actual >= expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to be >=' : 'to be >='} ${expected}`,
          actual,
          expected
        );
      }
    },
    toBeLessThan(expected: number) {
      totalAssertions++;
      const pass = typeof actual === 'number' && actual < expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to be <' : 'to be <'} ${expected}`,
          actual,
          expected
        );
      }
    },
    toBeLessThanOrEqual(expected: number) {
      totalAssertions++;
      const pass = typeof actual === 'number' && actual <= expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to be <=' : 'to be <='} ${expected}`,
          actual,
          expected
        );
      }
    },
    toContain(expected: any) {
      totalAssertions++;
      let pass = false;
      if (typeof actual === 'string') {
        pass = actual.includes(String(expected));
      } else if (Array.isArray(actual)) {
        pass = actual.some((item) => deepEqual(item, expected));
      } else if (actual instanceof Set || actual instanceof Map) {
        pass = actual.has(expected);
      }
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${formatValue(actual)} ${isNot ? 'NOT to contain' : 'to contain'} ${formatValue(expected)}`,
          actual,
          expected
        );
      }
    },
    toMatch(pattern: RegExp | string) {
      totalAssertions++;
      const reg = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      const pass = typeof actual === 'string' && reg.test(actual);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected "${String(actual)}" ${isNot ? 'NOT to match' : 'to match'} pattern ${pattern}`,
          actual,
          pattern
        );
      }
    },
    toThrow(expectedError?: string | RegExp) {
      totalAssertions++;
      if (typeof actual !== 'function') {
        throw new AssertionError(`Expected a function to test for throws, but received ${typeof actual}`);
      }
      let thrown: any = null;
      try {
        (actual as any)();
      } catch (err: any) {
        thrown = err;
      }
      const didThrow = thrown !== null;
      if (!isNot && !didThrow) {
        throw new AssertionError('Expected function to throw an error, but it did not throw.');
      }
      if (isNot && didThrow) {
        throw new AssertionError(`Expected function NOT to throw, but threw: ${thrown.message || thrown}`);
      }
      if (!isNot && didThrow && expectedError) {
        const message = thrown?.message || String(thrown);
        if (typeof expectedError === 'string') {
          if (!message.includes(expectedError)) {
            throw new AssertionError(
              `Expected thrown error "${message}" to contain "${expectedError}"`,
              message,
              expectedError
            );
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(message)) {
            throw new AssertionError(
              `Expected thrown error "${message}" to match regex ${expectedError}`,
              message,
              expectedError
            );
          }
        }
      }
    },
    toHaveLength(expected: number) {
      totalAssertions++;
      const len = (actual as any)?.length;
      const pass = typeof len === 'number' && len === expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected length ${isNot ? 'NOT to be' : 'to be'} ${expected}, got ${len}`,
          len,
          expected
        );
      }
    },
    toBeCloseTo(expected: number, precision: number = 2) {
      totalAssertions++;
      if (typeof actual !== 'number') {
        throw new AssertionError(`Expected number for toBeCloseTo, got ${typeof actual}`);
      }
      const pass = Math.abs(actual - expected) < Math.pow(10, -precision) / 2;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${actual} ${isNot ? 'NOT to be close to' : 'to be close to'} ${expected} with precision ${precision}`
        );
      }
    },
    get not() {
      return createMatchers(!isNot);
    },
  });

  return createMatchers(false);
}

// -------------------------------------------------------------
// Suite & Test Registry for runner
// -------------------------------------------------------------

export interface TestCaseResult {
  name: string;
  passed: boolean;
  error?: Error;
  durationMs: number;
}

export interface TestSuiteResult {
  name: string;
  tier: string;
  tests: TestCaseResult[];
  passed: boolean;
  durationMs: number;
}

export type TestFn = () => void | Promise<void>;

export class TestRegistry {
  private currentSuiteName: string = '';
  private currentTier: string = 'tier2';
  private tests: Array<{ name: string; fn: TestFn }> = [];

  setSuite(name: string, tier: string = 'tier2') {
    this.currentSuiteName = name;
    this.currentTier = tier;
    this.tests = [];
  }

  addTest(name: string, fn: TestFn) {
    this.tests.push({ name, fn });
  }

  async runSuite(): Promise<TestSuiteResult> {
    const start = Date.now();
    const results: TestCaseResult[] = [];
    let suitePassed = true;

    for (const t of this.tests) {
      const testStart = Date.now();
      try {
        await t.fn();
        results.push({
          name: t.name,
          passed: true,
          durationMs: Date.now() - testStart,
        });
      } catch (err: any) {
        suitePassed = false;
        results.push({
          name: t.name,
          passed: false,
          error: err instanceof Error ? err : new Error(String(err)),
          durationMs: Date.now() - testStart,
        });
      }
    }

    return {
      name: this.currentSuiteName,
      tier: this.currentTier,
      tests: results,
      passed: suitePassed,
      durationMs: Date.now() - start,
    };
  }
}
