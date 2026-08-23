/**
 * Tier 2 Test Suite: Boundary Value Analysis & Extreme Range Stress Testing
 * Suite: t2-28-rentflow-calculations-boundaries
 * Feature: F28 - RentFlow Pro Pure Mathematical Engine, Deductions Clamping & WhatsApp Formatting
 * Scope: Zero rent/admin/commission, high-precision floats, deduction overflow clamping,
 *        malformed deductions aggregation, phone number edge cases, WhatsApp URL encoding.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
  assertContains,
  TestRegistry,
  TestSuiteResult,
} from '../harness/assertions';
import {
  calculateSettlement,
  formatCOP,
  roundCurrency,
} from '../../../../src/modules/features/rentals/services/settlement-calculator';
import {
  generateTenantPaymentWhatsAppLink,
  generateOwnerPayoutWhatsAppLink,
} from '../../../../src/modules/features/rentals/services/whatsapp-notifier';
import { normalizePhone } from '../../../../src/modules/infrastructure/utils/normalize-phone';

export const suite = {
  name: 'T2-28: RentFlow Pro Mathematical Engine Extreme Boundaries & Edge Cases',
  tier: 'Tier 2',
  feature: 'F28: RentFlow Pro Mathematical Boundaries & Phone Formatting',
  tests: [
    // =========================================================================
    // 1. ZERO & NEUTRAL BOUNDARIES
    // =========================================================================
    {
      name: '1. Zero Rent, Zero Admin Fee, Zero Commission: All outputs strictly 0 without division by zero',
      fn: () => {
        const result = calculateSettlement({
          monthlyRent: 0,
          adminFee: 0,
          adminPaidBy: 'agency',
          commissionPercentage: 0,
          vatOnCommission: false,
          deductions: [],
        });

        assertEqual(result.rentAmount, 0, 'rentAmount is 0');
        assertEqual(result.adminFeeAmount, 0, 'adminFeeAmount is 0');
        assertEqual(result.grossCollected, 0, 'grossCollected is 0');
        assertEqual(result.commissionAmount, 0, 'commissionAmount is 0');
        assertEqual(result.vatAmount, 0, 'vatAmount is 0');
        assertEqual(result.totalAgencyFee, 0, 'totalAgencyFee is 0');
        assertEqual(result.deductionsAmount, 0, 'deductionsAmount is 0');
        assertEqual(result.netOwnerPayout, 0, 'netOwnerPayout is 0');
      },
    },
    {
      name: '2. Zero Rent with Positive Agency Admin Fee: Gross collected is admin fee, Net payout clamped to 0',
      fn: () => {
        // Rent is 0 (e.g. grace month), but tenant still pays condominium admin fee of 350,000 COP via agency
        const result = calculateSettlement({
          monthlyRent: 0,
          adminFee: 350000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [],
        });

        assertEqual(result.rentAmount, 0, 'Rent amount is 0');
        assertEqual(result.adminFeeAmount, 350000, 'Admin fee is 350,000');
        assertEqual(result.grossCollected, 350000, 'Gross collected is admin fee (350,000)');
        assertEqual(result.commissionAmount, 0, '0 rent yields 0 commission');
        assertEqual(result.vatAmount, 0, '0 commission yields 0 VAT');
        assertEqual(result.netOwnerPayout, 0, 'Net owner payout clamped to 0 (cannot be negative admin deduction)');
      },
    },

    // =========================================================================
    // 2. HIGH-PRECISION FLOATING POINT & STATUTORY TAX (IVA 19%)
    // =========================================================================
    {
      name: '3. High Precision Floating Point: Rent $1,234,567.89, Admin $98,765.43, Commission 8.333333%, VAT true',
      fn: () => {
        const result = calculateSettlement({
          monthlyRent: 1234567.89,
          adminFee: 98765.43,
          adminPaidBy: 'agency',
          commissionPercentage: 8.333333333333334, // 1/12th
          vatOnCommission: true,
          deductions: [
            { amount: 50.12 },
            { amount: 25.34 },
            { amount: 12.87 },
            { amount: 0.01 },
          ],
        });

        // 1. Rent & Admin
        assertEqual(result.rentAmount, 1234567.89, 'Rent amount matches cent precision');
        assertEqual(result.adminFeeAmount, 98765.43, 'Admin fee matches cent precision');

        // 2. Gross Collected = 1,234,567.89 + 98,765.43 = 1,333,333.32
        assertEqual(result.grossCollected, 1333333.32, 'Gross collected accurately summed to the cent');

        // 3. Commission = 1,234,567.89 * (8.333333333333334 / 100) = 102,880.6575... -> 102,880.66
        assertEqual(result.commissionAmount, 102880.66, 'Commission rounded to 2 decimals');

        // 4. VAT = 102,880.66 * 0.19 = 19,547.3254 -> 19,547.33
        assertEqual(result.vatAmount, 19547.33, 'VAT rounded to 2 decimals');

        // 5. Total Agency Fee = 102,880.66 + 19,547.33 = 122,427.99
        assertEqual(result.totalAgencyFee, 122427.99, 'Total agency fee summed accurately');

        // 6. Deductions = 50.12 + 25.34 + 12.87 + 0.01 = 88.34
        assertEqual(result.deductionsAmount, 88.34, 'Deductions summed accurately');

        // 7. Net Owner Payout = 1,234,567.89 - 102,880.66 - 19,547.33 - 98,765.43 - 88.34 = 1,013,286.13
        assertEqual(result.netOwnerPayout, 1013286.13, 'Net owner payout calculated down to the exact cent');
      },
    },
    {
      name: '4. High Precision Floating Point without VAT (vatOnCommission = false)',
      fn: () => {
        const result = calculateSettlement({
          monthlyRent: 1234567.89,
          adminFee: 98765.43,
          adminPaidBy: 'agency',
          commissionPercentage: 8.333333333333334,
          vatOnCommission: false,
          deductions: [{ amount: 88.34 }],
        });

        assertEqual(result.vatAmount, 0, 'VAT amount must be strictly 0');
        assertEqual(result.totalAgencyFee, 102880.66, 'Total agency fee equals commission');
        // Net = 1,234,567.89 - 102,880.66 - 0 - 98,765.43 - 88.34 = 1,032,833.46
        assertEqual(result.netOwnerPayout, 1032833.46, 'Net owner payout without VAT calculated accurately');
      },
    },

    // =========================================================================
    // 3. DEDUCTION OVERFLOW & NON-NEGATIVE NET CLAMPING
    // =========================================================================
    {
      name: '5. Massive Deductions Exceeding Gross Rent: Net payout clamped to 0 without returning negative balance',
      fn: () => {
        // Rent: $1,000,000, Admin: $200,000 (agency), Commission: 8% ($80,000), VAT: 19% ($15,200)
        // Base Net before deductions = 1,000,000 - 80,000 - 15,200 - 200,000 = 704,800
        // Deduction: $5,000,000 (Major pipe collapse)
        const result = calculateSettlement({
          monthlyRent: 1000000,
          adminFee: 200000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [{ amount: 5000000 }],
        });

        assertEqual(result.deductionsAmount, 5000000, 'Deductions registered at 5,000,000');
        assertEqual(result.netOwnerPayout, 0, 'Net owner payout must be clamped to 0, not -4,295,200');
      },
    },
    {
      name: '6. Exact Zero Boundary: Deductions exactly equal remaining net payout',
      fn: () => {
        // Base Net = 1,000,000 - 80,000 - 15,200 - 200,000 = 704,800
        const result = calculateSettlement({
          monthlyRent: 1000000,
          adminFee: 200000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [{ amount: 704800 }],
        });

        assertEqual(result.netOwnerPayout, 0, 'Net owner payout is exactly 0.00');
      },
    },
    {
      name: '7. Sub-Cent Overflow: Deductions exceed remaining net payout by 1 cent ($0.01)',
      fn: () => {
        const result = calculateSettlement({
          monthlyRent: 1000000,
          adminFee: 200000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [{ amount: 704800.01 }],
        });

        assertEqual(result.netOwnerPayout, 0, 'Sub-cent overflow clamped to 0');
      },
    },

    // =========================================================================
    // 4. MULTI-DEDUCTION ARRAY AGGREGATION & RESILIENCE
    // =========================================================================
    {
      name: '8. Multi-Deduction Precision: Sums 100 micro-deductions of $0.01 accurately to $1.00',
      fn: () => {
        const microDeductions = Array.from({ length: 100 }, () => ({ amount: 0.01 }));
        const result = calculateSettlement({
          monthlyRent: 100000,
          adminFee: 0,
          adminPaidBy: 'tenant',
          commissionPercentage: 0,
          vatOnCommission: false,
          deductions: microDeductions,
        });

        assertEqual(result.deductionsAmount, 1.0, '100 micro-deductions of 0.01 sum to 1.00');
        assertEqual(result.netOwnerPayout, 99999.0, 'Net owner payout subtracted by 1.00');
      },
    },
    {
      name: '9. Malformed Deductions Resilience: Ignores null, negative, and NaN deduction entries',
      fn: () => {
        const malformedDeductions = [
          { amount: 150000 },
          null as any,
          undefined as any,
          { amount: -50000 } as any, // Negative deduction ignored / clamped to 0
          { amount: NaN } as any,     // NaN deduction ignored
          { amount: 250000 },
        ];

        const result = calculateSettlement({
          monthlyRent: 1000000,
          adminFee: 0,
          adminPaidBy: 'tenant',
          commissionPercentage: 10,
          vatOnCommission: false,
          deductions: malformedDeductions,
        });

        // Valid sum = 150,000 + 250,000 = 400,000
        assertEqual(result.deductionsAmount, 400000, 'Malformed items ignored, valid sum = 400,000');
        // Net = 1,000,000 - 100,000 - 400,000 = 500,000
        assertEqual(result.netOwnerPayout, 500000, 'Net owner payout computed cleanly');
      },
    },

    // =========================================================================
    // 5. NEGATIVE / NAN / INFINITY INPUT SANITIZATION
    // =========================================================================
    {
      name: '10. Negative & Non-Numeric Input Sanitization: Clamps negative inputs to 0 safely',
      fn: () => {
        const result = calculateSettlement({
          monthlyRent: -2000000 as any,
          adminFee: -500000 as any,
          adminPaidBy: 'agency',
          commissionPercentage: -10 as any,
          vatOnCommission: true,
        });

        assertEqual(result.rentAmount, 0, 'Negative rent sanitized to 0');
        assertEqual(result.adminFeeAmount, 0, 'Negative admin fee sanitized to 0');
        assertEqual(result.commissionAmount, 0, 'Negative commission sanitized to 0');
        assertEqual(result.grossCollected, 0, 'Gross collected sanitized to 0');
        assertEqual(result.netOwnerPayout, 0, 'Net payout is 0');
      },
    },
    {
      name: '11. roundCurrency handles NaN, Infinity, and extreme fractions safely',
      fn: () => {
        assertEqual(roundCurrency(NaN), 0, 'NaN returns 0');
        assertEqual(roundCurrency(Infinity), 0, 'Infinity returns 0');
        assertEqual(roundCurrency(-Infinity), 0, '-Infinity returns 0');
        assertEqual(roundCurrency(123.456), 123.46, '123.456 rounds to 123.46');
        assertEqual(roundCurrency(123.454), 123.45, '123.454 rounds to 123.45');
      },
    },

    // =========================================================================
    // 6. COLOMBIAN CURRENCY FORMATTER (formatCOP)
    // =========================================================================
    {
      name: '12. formatCOP handles 0, millions, fractions, and invalid inputs gracefully',
      fn: () => {
        assertEqual(formatCOP(NaN), '$ 0', 'NaN formats to $ 0');
        assertEqual(formatCOP(Infinity), '$ 0', 'Infinity formats to $ 0');

        const zeroFormatted = formatCOP(0);
        assertTrue(zeroFormatted.includes('0'), '0 formats with 0');

        const millions = formatCOP(2500000);
        assertTrue(millions.includes('2.500.000'), '2,500,000 formats with dot thousand separators');

        const fractions = formatCOP(1234567.89);
        assertTrue(fractions.includes('1.234.568') || fractions.includes('1.234.567'), 'Fractions rounded to nearest COP integer');
      },
    },

    // =========================================================================
    // 7. PHONE NUMBER NORMALIZATION EDGE CASES
    // =========================================================================
    {
      name: '13. normalizePhone handles all Colombian formats (+57, 57, local prefixes, dashes, symbols)',
      fn: () => {
        // Standard 10 digit mobile
        assertEqual(normalizePhone('3001234567'), '573001234567', 'Standard 10-digit mobile prefixed with 57');

        // Already prefixed with 57
        assertEqual(normalizePhone('573001234567'), '573001234567', 'Already 57 prefixed remains unchanged');

        // With plus +57
        assertEqual(normalizePhone('+573001234567'), '573001234567', '+57 normalized to 57 without plus');

        // With spaces and hyphens
        assertEqual(normalizePhone('+57 (315) 987-6543'), '573159876543', 'Formatted string cleaned and normalized');

        // With leading national zero (03001234567)
        assertEqual(normalizePhone('03001234567'), '573001234567', 'Leading zero stripped');

        // With emojis, words and symbols
        assertEqual(normalizePhone('📱 Tel: +57 320.456.7890 (Móvil)'), '573204567890', 'Text and emojis stripped cleanly');

        // Empty string or null
        assertEqual(normalizePhone(''), '', 'Empty string returns empty string');
        assertEqual(normalizePhone(null as any), '', 'Null returns empty string');

        // Foreign international numbers (fallback to clean digits)
        assertEqual(normalizePhone('+1 (415) 555-2671', 'CO'), '14155552671', 'Foreign number returns cleaned digits');
      },
    },

    // =========================================================================
    // 8. WHATSAPP LINK GENERATOR WITH SPECIAL CHARACTERS & OPTIONAL FIELDS
    // =========================================================================
    {
      name: '14. generateTenantPaymentWhatsAppLink handles unicode characters, ampersands, and missing payment link',
      fn: () => {
        const link = generateTenantPaymentWhatsAppLink({
          tenantName: 'María José Peña & Cía S.A.S. 🏢',
          tenantPhone: '+57 318 765 4321',
          propertyTitle: 'Local Comercial 102 — Centro Comercial "La Estación"',
          period: 'Octubre 2026',
          monthlyRent: 4500000,
          adminFee: 650000,
          adminPaidBy: 'tenant', // Tenant pays admin directly
          paymentDay: 10,
          // paymentLink omitted
          agencyName: 'Inmobiliaria Éxito & Asociados',
        });

        // 1. URL prefix
        assertTrue(link.startsWith('https://wa.me/573187654321?text='), 'Target phone normalized');

        // 2. Decode text to inspect content
        const text = decodeURIComponent(link.split('?text=')[1]);

        // 3. Verifications
        assertContains(text, 'María José Peña & Cía S.A.S. 🏢', 'Unicode tenant name preserved');
        assertContains(text, 'Local Comercial 102 — Centro Comercial "La Estación"', 'Property title preserved');
        assertContains(text, 'Octubre 2026', 'Period preserved');
        assertContains(text, 'Inmobiliaria Éxito & Asociados', 'Agency name preserved');
        assertContains(text, 'transferencia y enviarnos el comprobante', 'Fallback bank transfer text present when no link');
        assertFalse(text.includes('Administración:'), 'Admin line excluded when admin is paid by tenant directly');
      },
    },
    {
      name: '15. generateOwnerPayoutWhatsAppLink handles complete financial breakdown, zero VAT, and missing statement URL',
      fn: () => {
        const link = generateOwnerPayoutWhatsAppLink({
          ownerName: 'Dr. Alejandro Muñóz-Berrío',
          ownerPhone: '0310 123 4567',
          propertyTitle: 'Penthouse 1401 — Torre Altavista',
          period: '2026-10',
          rentAmount: 6000000,
          commissionAmount: 480000,
          vatAmount: 0, // VAT exempt
          adminFeeAmount: 0,
          adminPaidBy: 'tenant',
          deductionsAmount: 350000,
          netOwnerPayout: 5170000,
          bankName: 'Banco BBVA Colombia',
          accountNumber: 'Cta Ahorros 0013-0876-5432109876',
          // statementPdfUrl omitted
          agencyName: 'Praxis Inmobiliaria',
        });

        assertTrue(link.startsWith('https://wa.me/573101234567?text='), 'Phone normalized from leading zero format');

        const text = decodeURIComponent(link.split('?text=')[1]);

        assertContains(text, 'Alejandro Muñóz-Berrío', 'Owner name preserved');
        assertContains(text, 'Banco BBVA Colombia', 'Bank name preserved');
        assertContains(text, '0013-0876-5432109876', 'Account number preserved');
        assertContains(text, 'Deducciones / Mantenimiento: -$ 350.000', 'Deductions line present');
        assertFalse(text.includes('IVA Comisión'), 'Zero VAT line excluded');
        assertFalse(text.includes('Descarga tu extracto'), 'Statement PDF section excluded when undefined');
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

if (process.argv[1] && process.argv[1].endsWith('t2-28-rentflow-calculations-boundaries.test.ts')) {
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
      console.log('\nAll RentFlow Pro boundary & mathematical edge-case tests passed with 0 errors!\n');
      process.exit(0);
    }
  });
}
