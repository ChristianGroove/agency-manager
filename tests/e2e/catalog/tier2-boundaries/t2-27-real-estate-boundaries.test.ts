/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-27-real-estate-boundaries
 * Feature: Real Estate Boundary & Corner Cases
 * Scope: Empty properties, invalid categories, extreme property prices/areas, multi-currency, mortgage simulator boundaries.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
  assertInRange,
  expect,
  TestRegistry,
  TestSuiteResult,
} from '../harness/assertions';
import {
  UniversalCatalogItem,
  validateUniversalCatalogItem,
  sanitizeHtml,
} from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';

// Helper functions for boundary handling
export function calculatePricePerM2(price: number, areaM2?: number | null): number {
  if (!areaM2 || areaM2 <= 0) return 0;
  if (price <= 0) return 0;
  return Math.round(price / areaM2);
}

export function convertCurrency(
  amountCOP: number,
  targetCurrency: 'USD' | 'EUR' | 'COP',
  exchangeRates: { USD: number; EUR: number } = { USD: 4000, EUR: 4300 }
): { amount: number; formatted: string } {
  if (amountCOP <= 0) {
    return {
      amount: 0,
      formatted: targetCurrency === 'USD' ? '$0 USD' : targetCurrency === 'EUR' ? '€0 EUR' : '$0 COP',
    };
  }

  if (targetCurrency === 'COP') {
    return {
      amount: amountCOP,
      formatted: `$${amountCOP.toLocaleString('es-CO')} COP`,
    };
  }

  const rate = exchangeRates[targetCurrency] || 1;
  const converted = Math.round((amountCOP / rate) * 100) / 100;
  const symbol = targetCurrency === 'USD' ? '$' : '€';
  const formatted = `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${targetCurrency}`;

  return { amount: converted, formatted };
}

export function calculateMortgagePayment(params: {
  propertyPrice: number;
  downPaymentPercent: number; // 0 to 100
  annualInterestRate: number; // e.g. 12.5 for 12.5%
  termYears: number; // e.g. 20
}): {
  downPayment: number;
  loanAmount: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
} {
  const price = Math.max(0, params.propertyPrice);
  const downPercent = Math.max(0, Math.min(100, params.downPaymentPercent));
  const downPayment = Math.round(price * (downPercent / 100));
  const loanAmount = Math.max(0, price - downPayment);

  if (loanAmount === 0 || params.termYears <= 0) {
    return {
      downPayment,
      loanAmount: 0,
      monthlyPayment: 0,
      totalPayment: downPayment,
      totalInterest: 0,
    };
  }

  const totalMonths = Math.max(1, Math.round(params.termYears * 12));
  const annualRate = Math.max(0, params.annualInterestRate);

  if (annualRate === 0) {
    const monthlyPayment = Math.round(loanAmount / totalMonths);
    return {
      downPayment,
      loanAmount,
      monthlyPayment,
      totalPayment: downPayment + loanAmount,
      totalInterest: 0,
    };
  }

  const monthlyRate = annualRate / 100 / 12;
  const compound = Math.pow(1 + monthlyRate, totalMonths);
  const monthlyPayment = Math.round((loanAmount * (monthlyRate * compound)) / (compound - 1));
  const totalPayment = downPayment + monthlyPayment * totalMonths;
  const totalInterest = Math.max(0, totalPayment - price);

  return {
    downPayment,
    loanAmount,
    monthlyPayment,
    totalPayment,
    totalInterest,
  };
}

export function resolvePublicPropertyLocation(details?: {
  city?: string;
  neighborhood?: string;
  address?: string;
  hide_exact_address?: boolean;
}): string {
  if (!details) return 'Ubicación no especificada';
  const city = details.city?.trim() || 'Colombia';
  const neighborhood = details.neighborhood?.trim() || '';

  if (details.hide_exact_address) {
    return neighborhood ? `${neighborhood}, ${city}` : city;
  }

  const address = details.address?.trim();
  if (address && neighborhood) {
    return `${neighborhood}, ${city} (${address})`;
  } else if (address) {
    return `${city} (${address})`;
  }
  return neighborhood ? `${neighborhood}, ${city}` : city;
}

export const suite = {
  name: 'T2-27: Real Estate Boundary Value & Extreme Range Stress Suite',
  tier: 'Tier 2',
  feature: 'F27: Real Estate Edge Cases & Multi-Currency Boundaries',
  tests: [
    // =========================================================================
    // 1. EMPTY & PARTIAL PROPERTY VALIDATION
    // =========================================================================
    {
      name: '1. Handles empty or partially specified real estate catalog items safely',
      fn: () => {
        const emptyProperty: Partial<UniversalCatalogItem> = {
          id: 're-empty-001',
          organization_id: TENANT_A_ID,
          name: 'Propiedad en Borrador',
          base_price: 0,
          type: 'real_estate',
          classification: 'real_estate',
          gallery_images: [],
          inventory_quantity: 0,
          track_inventory: false,
          allow_backorders: false,
          low_stock_threshold: 0,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: [],
          specifications: {},
          is_visible_in_portal: false,
          is_active: false,
          created_at: '2026-08-22T00:00:00Z',
        };

        const res = validateUniversalCatalogItem(emptyProperty);
        assertTrue(res.isValid, 'Empty draft property with base fields should be structurally valid');
      },
    },
    {
      name: '2. Rejects invalid classification and negative price on property items',
      fn: () => {
        const invalidProperty = {
          id: 're-invalid-002',
          organization_id: TENANT_A_ID,
          name: 'Propiedad Malformada',
          base_price: -5000000,
          type: 'invalid_type' as any,
          classification: 'invalid_class' as any,
        };

        const res = validateUniversalCatalogItem(invalidProperty);
        assertFalse(res.isValid);
        assertTrue(res.errors.some((e) => e.includes('base_price must be a non-negative number')));
        assertTrue(res.errors.some((e) => e.includes('classification must be one of:')));
      },
    },

    // =========================================================================
    // 2. EXTREME PROPERTY PRICES ($0 to $50 Billion COP)
    // =========================================================================
    {
      name: '3. Accurately handles extreme high luxury property prices ($50,000,000,000 COP) without numeric overflow',
      fn: () => {
        const extremePrice = 50_000_000_000; // 50 Billion COP ($50 mil millones)
        const area = 2500; // 2,500 m2 luxury compound

        const ppm2 = calculatePricePerM2(extremePrice, area);
        assertEqual(ppm2, 20_000_000); // 20M COP per m2

        const currencyConversion = convertCurrency(extremePrice, 'COP');
        assertEqual(currencyConversion.amount, 50_000_000_000);
        assertTrue(currencyConversion.formatted.includes('50.000.000.000'));
      },
    },
    {
      name: '4. Handles $0 promotional or assignment properties gracefully',
      fn: () => {
        const zeroPrice = 0;
        const area = 80;

        const ppm2 = calculatePricePerM2(zeroPrice, area);
        assertEqual(ppm2, 0);

        const conv = convertCurrency(zeroPrice, 'USD');
        assertEqual(conv.amount, 0);
        assertEqual(conv.formatted, '$0 USD');
      },
    },

    // =========================================================================
    // 3. EXTREME PROPERTY AREAS & PRICE PER M2
    // =========================================================================
    {
      name: '5. Calculates price per m2 for micro-studios (10m2) to mega-haciendas (100,000m2)',
      fn: () => {
        // Micro studio in Bogota: 12m2 for $180M COP
        const microPrice = 180_000_000;
        const microArea = 12;
        const microPpm2 = calculatePricePerM2(microPrice, microArea);
        assertEqual(microPpm2, 15_000_000);

        // Mega hacienda in Llanos: 100,000m2 for $5 Billion COP
        const haciendaPrice = 5_000_000_000;
        const haciendaArea = 100_000;
        const haciendaPpm2 = calculatePricePerM2(haciendaPrice, haciendaArea);
        assertEqual(haciendaPpm2, 50_000); // 50,000 COP / m2

        // Division by zero safeguard
        const zeroAreaPpm2 = calculatePricePerM2(microPrice, 0);
        assertEqual(zeroAreaPpm2, 0);

        const nullAreaPpm2 = calculatePricePerM2(microPrice, undefined);
        assertEqual(nullAreaPpm2, 0);
      },
    },

    // =========================================================================
    // 4. MULTI-CURRENCY CONVERSIONS (COP, USD, EUR)
    // =========================================================================
    {
      name: '6. Converts property values across COP, USD, and EUR with precision',
      fn: () => {
        const priceCOP = 1_200_000_000; // 1.2 Billion COP
        const customRates = { USD: 4000, EUR: 4300 };

        const inUSD = convertCurrency(priceCOP, 'USD', customRates);
        assertEqual(inUSD.amount, 300000); // $300,000 USD
        assertEqual(inUSD.formatted, '$300,000.00 USD');

        const inEUR = convertCurrency(priceCOP, 'EUR', customRates);
        assertEqual(inEUR.amount, 279069.77); // ~279,069.77 EUR
        assertEqual(inEUR.formatted, '€279,069.77 EUR');

        const inCOP = convertCurrency(priceCOP, 'COP');
        assertEqual(inCOP.amount, 1_200_000_000);
        assertTrue(inCOP.formatted.includes('1.200.000.000'));
      },
    },

    // =========================================================================
    // 5. LOCATION PRIVACY & XSS SANITIZATION
    // =========================================================================
    {
      name: '7. Enforces exact address hiding policy and sanitizes user-supplied location metadata',
      fn: () => {
        // Protected location (exact address hidden)
        const hiddenLoc = resolvePublicPropertyLocation({
          city: 'Medellín',
          neighborhood: 'El Poblado',
          address: 'Calle 10 # 32-40 Apt 1201',
          hide_exact_address: true,
        });
        assertEqual(hiddenLoc, 'El Poblado, Medellín');
        assertFalse(hiddenLoc.includes('Calle 10'));

        // Public location (exact address revealed)
        const publicLoc = resolvePublicPropertyLocation({
          city: 'Medellín',
          neighborhood: 'El Poblado',
          address: 'Calle 10 # 32-40',
          hide_exact_address: false,
        });
        assertEqual(publicLoc, 'El Poblado, Medellín (Calle 10 # 32-40)');

        // XSS sanitization check
        const maliciousAddress = '<script>alert("xss")</script>Carrera 43A # 1-50<img src=x onerror=alert(1)>';
        const sanitized = sanitizeHtml(maliciousAddress);
        assertFalse(sanitized.includes('<script>'));
        assertFalse(sanitized.includes('onerror'));
        assertEqual(sanitized, 'Carrera 43A # 1-50');
      },
    },

    // =========================================================================
    // 6. MORTGAGE FINANCIAL SIMULATOR BOUNDARIES
    // =========================================================================
    {
      name: '8. Evaluates mortgage calculation boundaries: 0% down, 100% cash, 0% interest, and 30-year terms',
      fn: () => {
        const propertyPrice = 1_000_000_000; // 1 Billion COP

        // Boundary A: 100% Cash Purchase (0% loan)
        const cashCalc = calculateMortgagePayment({
          propertyPrice,
          downPaymentPercent: 100,
          annualInterestRate: 12.0,
          termYears: 20,
        });
        assertEqual(cashCalc.downPayment, 1_000_000_000);
        assertEqual(cashCalc.loanAmount, 0);
        assertEqual(cashCalc.monthlyPayment, 0);
        assertEqual(cashCalc.totalInterest, 0);

        // Boundary B: 0% Down Payment (100% financed)
        const fullFinance = calculateMortgagePayment({
          propertyPrice,
          downPaymentPercent: 0,
          annualInterestRate: 12.0,
          termYears: 20,
        });
        assertEqual(fullFinance.downPayment, 0);
        assertEqual(fullFinance.loanAmount, 1_000_000_000);
        assertTrue(fullFinance.monthlyPayment > 10_000_000);

        // Boundary C: 0% Interest Rate (Interest-free financing)
        const zeroInterest = calculateMortgagePayment({
          propertyPrice,
          downPaymentPercent: 20,
          annualInterestRate: 0,
          termYears: 20,
        });
        assertEqual(zeroInterest.downPayment, 200_000_000);
        assertEqual(zeroInterest.loanAmount, 800_000_000);
        assertEqual(zeroInterest.totalInterest, 0);
        // 800M / 240 months = ~3,333,333 COP/mo
        assertEqual(zeroInterest.monthlyPayment, Math.round(800_000_000 / 240));

        // Boundary D: 30 Year Standard Mortgages (360 months)
        const thirtyYear = calculateMortgagePayment({
          propertyPrice,
          downPaymentPercent: 30,
          annualInterestRate: 11.5,
          termYears: 30,
        });
        assertEqual(thirtyYear.downPayment, 300_000_000);
        assertEqual(thirtyYear.loanAmount, 700_000_000);
        assertTrue(thirtyYear.monthlyPayment > 6_000_000);
        assertTrue(thirtyYear.monthlyPayment < 8_000_000);
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
