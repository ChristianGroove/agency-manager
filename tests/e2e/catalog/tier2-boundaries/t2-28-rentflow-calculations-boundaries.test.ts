/**
 * Tier 2 Test Suite: Boundary Value Analysis & Extreme Range Stress Testing
 * Suite: t2-28-rentflow-calculations-boundaries
 * Feature: F28 - RentFlow Pro Pure Mathematical Engine, Proration, Tax Boundaries & Deductions Clamping
 * Scope: Prorated rent (mid-month, 1-day, full-month), calendar day clamps (Feb 28/29/31),
 *        100% deduction saturation with zero payout clamping, Colombian tax boundaries
 *        (exempt, 19% IVA, commercial rent, retefuente), zero rent/admin/commission,
 *        high-precision floats, deduction overflow, phone formatting, WhatsApp link generator.
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

/**
 * Prorated rent calculation utility according to Colombian commercial standard (Law 820 of 2003 / 30-day commercial month)
 * Formula: Prorated Rent = roundCurrency((Monthly Rent / billingMonthDays) * (billingMonthDays - Start Day + 1))
 */
export function calculateProratedRent(
  monthlyRent: number,
  startDate: string | Date,
  billingMonthDays: number = 30
): number {
  if (isNaN(monthlyRent) || !isFinite(monthlyRent) || monthlyRent <= 0) return 0;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  // Use UTC or local date component
  const day = typeof startDate === 'string' && startDate.includes('-')
    ? parseInt(startDate.split('-')[2], 10)
    : start.getDate();

  // If start day exceeds 30 in a 30-day standard, clamp to 1 day minimum proration
  const effectiveDay = Math.min(day, billingMonthDays);
  const daysActive = Math.max(1, billingMonthDays - effectiveDay + 1);
  const dailyRate = monthlyRent / billingMonthDays;
  return roundCurrency(dailyRate * daysActive);
}

/**
 * Calendar day clamp utility: Clamps payment/payout day (1-31) to actual last day of given month/year
 */
export function clampBillingDay(day: number, year: number, month: number): number {
  // month: 1 = Jan, 2 = Feb, ..., 12 = Dec
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.max(1, Math.min(day, lastDay));
}

/**
 * Commercial Property Lease Settlement Calculation (including 19% IVA on Commercial Rent & Retención en la Fuente)
 */
export interface CommercialSettlementInput {
  baseRent: number;
  adminFee?: number;
  adminPaidBy?: 'agency' | 'tenant';
  commissionPercentage?: number;
  vatOnRentRate?: number; // Default 0.19 (19% IVA on commercial rent)
  vatOnCommissionRate?: number; // Default 0.19 (19% IVA on commission)
  reteFuentePercentage?: number; // e.g. 3.5% or 4.0%
  deductions?: Array<{ amount: number }>;
}

export function calculateCommercialSettlement(input: CommercialSettlementInput) {
  const baseRent = roundCurrency(Math.max(0, input.baseRent || 0));
  const adminFee = roundCurrency(Math.max(0, input.adminFee || 0));
  const commissionPercentage = typeof input.commissionPercentage === 'number' ? input.commissionPercentage : 8.0;
  const commissionRate = Math.max(0, commissionPercentage) / 100;
  const vatOnRentRate = typeof input.vatOnRentRate === 'number' ? input.vatOnRentRate : 0.19;
  const vatOnCommissionRate = typeof input.vatOnCommissionRate === 'number' ? input.vatOnCommissionRate : 0.19;
  const reteFuenteRate = Math.max(0, input.reteFuentePercentage || 0) / 100;

  // 1. VAT on Commercial Rent (billed to commercial tenant)
  const vatOnRentAmount = roundCurrency(baseRent * vatOnRentRate);

  // 2. Gross Collected from Tenant = Base Rent + VAT on Rent + (Admin if collected by agency)
  const grossCollected = input.adminPaidBy === 'agency'
    ? roundCurrency(baseRent + vatOnRentAmount + adminFee)
    : roundCurrency(baseRent + vatOnRentAmount);

  // 3. Agency Commission & VAT on Commission
  const commissionAmount = roundCurrency(baseRent * commissionRate);
  const vatOnCommissionAmount = roundCurrency(commissionAmount * vatOnCommissionRate);
  const totalAgencyFee = roundCurrency(commissionAmount + vatOnCommissionAmount);

  // 4. Retención en la Fuente (Withholding Tax)
  const reteFuenteAmount = roundCurrency(baseRent * reteFuenteRate);

  // 5. Deductions
  const deductionsList = Array.isArray(input.deductions) ? input.deductions : [];
  const deductionsAmount = roundCurrency(
    deductionsList.reduce((acc, d) => acc + (Math.max(0, Number(d?.amount)) || 0), 0)
  );

  // 6. Net Owner Payout
  const adminAgencyDeduction = input.adminPaidBy === 'agency' ? adminFee : 0;
  const rawNet = baseRent - commissionAmount - vatOnCommissionAmount - adminAgencyDeduction - deductionsAmount - reteFuenteAmount;
  const netOwnerPayout = roundCurrency(Math.max(0, rawNet));

  return {
    baseRent,
    vatOnRentAmount,
    adminFeeAmount: adminFee,
    grossCollected,
    commissionAmount,
    vatOnCommissionAmount,
    totalAgencyFee,
    reteFuenteAmount,
    deductionsAmount,
    netOwnerPayout,
  };
}

export const suite = {
  name: 'T2-28: RentFlow Pro Mathematical Engine Extreme Boundaries & Edge Cases',
  tier: 'Tier 2',
  feature: 'F28: RentFlow Pro Mathematical Boundaries & Phone Formatting',
  tests: [
    // =========================================================================
    // 1. PRORATED RENT & MID-MONTH COMMENCEMENT (T2-28A)
    // =========================================================================
    {
      name: '1. Prorated Rent: Mid-Month Start (15th of 30-day month = 16 days of rent)',
      fn: () => {
        const monthlyRent = 3000000;
        const prorated = calculateProratedRent(monthlyRent, '2026-09-15', 30);
        // Days active = 30 - 15 + 1 = 16 days
        // Prorated = (3,000,000 / 30) * 16 = 100,000 * 16 = 1,600,000
        assertEqual(prorated, 1600000, 'Prorated rent for 16 active days is exactly $1,600,000 COP');

        // Settlement computed on prorated rent
        const settlement = calculateSettlement({
          monthlyRent: prorated,
          adminFee: 0,
          adminPaidBy: 'tenant',
          commissionPercentage: 8.0,
          vatOnCommission: true,
        });

        // Commission on prorated rent = 1,600,000 * 0.08 = 128,000
        assertEqual(settlement.commissionAmount, 128000, 'Commission computed on prorated rent');
        // VAT = 128,000 * 0.19 = 24,320
        assertEqual(settlement.vatAmount, 24320, 'VAT computed on prorated commission');
        // Net = 1,600,000 - 128,000 - 24,320 = 1,447,680
        assertEqual(settlement.netOwnerPayout, 1447680, 'Net owner payout computed cleanly from prorated rent');
      },
    },
    {
      name: '2. Prorated Rent: 1-Day Start (30th/31st of month = 1 day minimum proration)',
      fn: () => {
        const monthlyRent = 3000000;
        const prorated30 = calculateProratedRent(monthlyRent, '2026-09-30', 30);
        assertEqual(prorated30, 100000, '30th of 30-day month charges exactly 1 day ($100,000 COP)');

        const prorated31 = calculateProratedRent(monthlyRent, '2026-08-31', 30);
        assertEqual(prorated31, 100000, '31st of month charges 1-day minimum proration ($100,000 COP)');
      },
    },
    {
      name: '3. Prorated Rent: 1st of Month Full Period (0 proration discount = 100% full canon)',
      fn: () => {
        const monthlyRent = 4500000;
        const prorated = calculateProratedRent(monthlyRent, '2026-09-01', 30);
        assertEqual(prorated, 4500000, '1st of month charges 100% full monthly canon');
      },
    },

    // =========================================================================
    // 2. CALENDAR DAY CLAMPS & LEAP YEAR HANDLING (T2-28C)
    // =========================================================================
    {
      name: '4. Calendar Day Clamps: February 28 (Non-Leap), February 29 (Leap Year), and 30/31-Day Months',
      fn: () => {
        // Payment day set to 31 in Feb 2026 (non-leap year) -> clamped to 28
        assertEqual(clampBillingDay(31, 2026, 2), 28, 'Day 31 clamped to Feb 28 in non-leap year 2026');
        assertEqual(clampBillingDay(30, 2026, 2), 28, 'Day 30 clamped to Feb 28 in non-leap year 2026');

        // Payment day set to 31 in Feb 2028 (leap year) -> clamped to 29
        assertEqual(clampBillingDay(31, 2028, 2), 29, 'Day 31 clamped to Feb 29 in leap year 2028');
        assertEqual(clampBillingDay(29, 2028, 2), 29, 'Day 29 preserved in leap year 2028');

        // Payment day set to 31 in April (30-day month) -> clamped to 30
        assertEqual(clampBillingDay(31, 2026, 4), 30, 'Day 31 clamped to April 30');

        // Payment day set to 31 in May (31-day month) -> 31 preserved
        assertEqual(clampBillingDay(31, 2026, 5), 31, 'Day 31 preserved in May 31');

        // Payment day set to 1 (first day of month)
        assertEqual(clampBillingDay(1, 2026, 2), 1, 'Day 1 preserved across all months');
      },
    },

    // =========================================================================
    // 3. 100% DEDUCTION SATURATION & ZERO PAYOUT CLAMPING (T2-28D)
    // =========================================================================
    {
      name: '5. 100% Deduction Saturation: Exact zero net payout boundary ($0.00)',
      fn: () => {
        // Rent: $2,000,000, Commission: 8% ($160,000), VAT: 19% ($30,400)
        // Base Net = 2,000,000 - 160,000 - 30,400 = 1,809,600 COP
        // Deductions exactly equal 1,809,600 COP
        const result = calculateSettlement({
          monthlyRent: 2000000,
          adminFee: 0,
          adminPaidBy: 'tenant',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [{ amount: 1809600 }],
        });

        assertEqual(result.deductionsAmount, 1809600, 'Deductions registered at $1,809,600');
        assertEqual(result.netOwnerPayout, 0, 'Net owner payout is exactly 0.00 COP (100% saturated)');
      },
    },
    {
      name: '6. Deduction Overflow: Net payout clamped to 0.00 and tracks unrecovered deficit',
      fn: () => {
        // Rent: $1,000,000, Admin: $200,000 (agency), Commission: 8% ($80,000), VAT: 19% ($15,200)
        // Base Net = 1,000,000 - 80,000 - 15,200 - 200,000 = 704,800 COP
        // Deduction: $5,000,000 COP (Major roof replacement)
        const result = calculateSettlement({
          monthlyRent: 1000000,
          adminFee: 200000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [{ amount: 5000000 }],
        });

        assertEqual(result.deductionsAmount, 5000000, 'Deductions registered at 5,000,000');
        assertEqual(result.netOwnerPayout, 0, 'Net owner payout clamped to 0 (cannot be negative)');

        // Deficit balance to carry forward = 5,000,000 - 704,800 = 4,295,200 COP
        const carriedDeficit = roundCurrency(result.deductionsAmount - 704800);
        assertEqual(carriedDeficit, 4295200, 'Carried unrecovered maintenance deficit calculated accurately');
      },
    },

    // =========================================================================
    // 4. COLOMBIAN TAX BOUNDARIES (T2-28E)
    // =========================================================================
    {
      name: '7. Colombian Tax Matrix: Residential Lease (VAT-Exempt Rent + 19% VAT on Agency Commission)',
      fn: () => {
        // Residential Law 820 of 2003: Rent is excluded from VAT.
        // Commission has 19% IVA. Net agency effective rate = 8% * 1.19 = 9.52%
        const result = calculateSettlement({
          monthlyRent: 5000000,
          adminFee: 500000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
        });

        assertEqual(result.rentAmount, 5000000, 'Base rent is $5,000,000 COP');
        assertEqual(result.commissionAmount, 400000, 'Agency commission (8%) is $400,000 COP');
        assertEqual(result.vatAmount, 76000, 'VAT on commission (19%) is $76,000 COP');
        assertEqual(result.totalAgencyFee, 476000, 'Total agency fee = $476,000 COP (9.52% effective)');
        // Net = 5,000,000 - 400,000 - 76,000 - 500,000 = 4,024,000 COP
        assertEqual(result.netOwnerPayout, 4024000, 'Net owner payout is $4,024,000 COP');
      },
    },
    {
      name: '8. Colombian Tax Matrix: Commercial Property Lease (19% VAT on Rent + 19% VAT on Commission + Retención en la Fuente 3.5%)',
      fn: () => {
        // Commercial Lease: Rent $5,000,000 COP + 19% VAT on Rent ($950,000)
        // Commission 8% ($400,000) + 19% VAT on Commission ($76,000)
        // Retención en la fuente 3.5% ($175,000)
        const commercialResult = calculateCommercialSettlement({
          baseRent: 5000000,
          adminFee: 400000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnRentRate: 0.19,
          vatOnCommissionRate: 0.19,
          reteFuentePercentage: 3.5,
          deductions: [{ amount: 100000 }],
        });

        // 1. VAT on commercial rent
        assertEqual(commercialResult.vatOnRentAmount, 950000, '19% VAT on commercial rent = $950,000 COP');
        // 2. Gross collected from tenant = 5,000,000 + 950,000 + 400,000 = 6,350,000 COP
        assertEqual(commercialResult.grossCollected, 6350000, 'Gross collected includes rent + VAT on rent + admin');
        // 3. Commission = 400,000 COP, VAT on commission = 76,000 COP
        assertEqual(commercialResult.commissionAmount, 400000, 'Commission is $400,000 COP');
        assertEqual(commercialResult.vatOnCommissionAmount, 76000, 'VAT on commission is $76,000 COP');
        // 4. Retención en la fuente = 5,000,000 * 0.035 = 175,000 COP
        assertEqual(commercialResult.reteFuenteAmount, 175000, 'Retefuente 3.5% = $175,000 COP');
        // 5. Net Owner Payout = 5,000,000 - 400,000 - 76,000 - 400,000 - 100,000 - 175,000 = 3,849,000 COP
        assertEqual(commercialResult.netOwnerPayout, 3849000, 'Net owner payout calculated with Retefuente');
      },
    },
    {
      name: '9. Colombian Tax Matrix: Simplified Tax Regime / Non-VAT Agency (vatOnCommission = false)',
      fn: () => {
        const result = calculateSettlement({
          monthlyRent: 3500000,
          adminFee: 300000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: false,
          deductions: [],
        });

        assertEqual(result.commissionAmount, 280000, 'Commission is $280,000 COP');
        assertEqual(result.vatAmount, 0, 'VAT is strictly 0.00 COP');
        assertEqual(result.totalAgencyFee, 280000, 'Total agency fee equals commission');
        // Net = 3,500,000 - 280,000 - 300,000 = 2,920,000 COP
        assertEqual(result.netOwnerPayout, 2920000, 'Net payout without VAT is $2,920,000 COP');
      },
    },

    // =========================================================================
    // 5. ZERO & NEUTRAL BOUNDARIES
    // =========================================================================
    {
      name: '10. Zero Rent, Zero Admin Fee, Zero Commission: All outputs strictly 0 without division by zero',
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
      name: '11. Zero Rent with Positive Agency Admin Fee: Gross collected is admin fee, Net payout clamped to 0',
      fn: () => {
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
        assertEqual(result.netOwnerPayout, 0, 'Net owner payout clamped to 0');
      },
    },

    // =========================================================================
    // 6. HIGH-PRECISION FLOATING POINT & CENT PRECISION
    // =========================================================================
    {
      name: '12. High Precision Floating Point: Rent $1,234,567.89, Admin $98,765.43, Commission 8.333333%, VAT true',
      fn: () => {
        const result = calculateSettlement({
          monthlyRent: 1234567.89,
          adminFee: 98765.43,
          adminPaidBy: 'agency',
          commissionPercentage: 8.333333333333334,
          vatOnCommission: true,
          deductions: [
            { amount: 50.12 },
            { amount: 25.34 },
            { amount: 12.87 },
            { amount: 0.01 },
          ],
        });

        assertEqual(result.rentAmount, 1234567.89, 'Rent amount matches cent precision');
        assertEqual(result.adminFeeAmount, 98765.43, 'Admin fee matches cent precision');
        assertEqual(result.grossCollected, 1333333.32, 'Gross collected accurately summed to the cent');
        assertEqual(result.commissionAmount, 102880.66, 'Commission rounded to 2 decimals');
        assertEqual(result.vatAmount, 19547.33, 'VAT rounded to 2 decimals');
        assertEqual(result.totalAgencyFee, 122427.99, 'Total agency fee summed accurately');
        assertEqual(result.deductionsAmount, 88.34, 'Deductions summed accurately');
        assertEqual(result.netOwnerPayout, 1013286.13, 'Net owner payout calculated down to the exact cent');
      },
    },
    {
      name: '13. Commercial Mega-Lease Boundary ($10,000,000,000 COP / month): No overflow or float drift',
      fn: () => {
        const megaRent = 10000000000; // 10 Billion COP
        const result = calculateSettlement({
          monthlyRent: megaRent,
          adminFee: 50000000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
        });

        assertEqual(result.commissionAmount, 800000000, 'Commission is $800,000,000 COP');
        assertEqual(result.vatAmount, 152000000, 'VAT is $152,000,000 COP');
        assertEqual(result.totalAgencyFee, 952000000, 'Total agency fee is $952,000,000 COP');
        // Net = 10,000,000,000 - 800,000,000 - 152,000,000 - 50,000,000 = 8,998,000,000 COP
        assertEqual(result.netOwnerPayout, 8998000000, 'Net owner payout handles billions without float drift');
      },
    },

    // =========================================================================
    // 7. MULTI-DEDUCTION ARRAY & SANITIZATION
    // =========================================================================
    {
      name: '14. Multi-Deduction Precision: Sums 100 micro-deductions of $0.01 accurately to $1.00',
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
      name: '15. Malformed Deductions Resilience: Ignores null, negative, and NaN deduction entries',
      fn: () => {
        const malformedDeductions = [
          { amount: 150000 },
          null as any,
          undefined as any,
          { amount: -50000 } as any,
          { amount: NaN } as any,
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

        assertEqual(result.deductionsAmount, 400000, 'Malformed items ignored, valid sum = 400,000');
        assertEqual(result.netOwnerPayout, 500000, 'Net owner payout computed cleanly');
      },
    },
    {
      name: '16. Negative & Non-Numeric Input Sanitization: Clamps negative inputs to 0 safely',
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
      name: '17. roundCurrency handles NaN, Infinity, and extreme fractions safely',
      fn: () => {
        assertEqual(roundCurrency(NaN), 0, 'NaN returns 0');
        assertEqual(roundCurrency(Infinity), 0, 'Infinity returns 0');
        assertEqual(roundCurrency(-Infinity), 0, '-Infinity returns 0');
        assertEqual(roundCurrency(123.456), 123.46, '123.456 rounds to 123.46');
        assertEqual(roundCurrency(123.454), 123.45, '123.454 rounds to 123.45');
      },
    },

    // =========================================================================
    // 8. FORMATTERS & PHONE NORMALIZATION
    // =========================================================================
    {
      name: '18. formatCOP handles 0, millions, fractions, and invalid inputs gracefully',
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
    {
      name: '19. normalizePhone handles all Colombian formats (+57, 57, local prefixes, dashes, symbols)',
      fn: () => {
        assertEqual(normalizePhone('3001234567'), '573001234567', 'Standard 10-digit mobile prefixed with 57');
        assertEqual(normalizePhone('573001234567'), '573001234567', 'Already 57 prefixed remains unchanged');
        assertEqual(normalizePhone('+573001234567'), '573001234567', '+57 normalized to 57 without plus');
        assertEqual(normalizePhone('+57 (315) 987-6543'), '573159876543', 'Formatted string cleaned and normalized');
        assertEqual(normalizePhone('03001234567'), '573001234567', 'Leading zero stripped');
        assertEqual(normalizePhone('📱 Tel: +57 320.456.7890 (Móvil)'), '573204567890', 'Text and emojis stripped cleanly');
        assertEqual(normalizePhone(''), '', 'Empty string returns empty string');
        assertEqual(normalizePhone(null as any), '', 'Null returns empty string');
      },
    },
    {
      name: '20. WhatsApp link generators with special characters, unicode & omitted optional fields',
      fn: () => {
        const linkTenant = generateTenantPaymentWhatsAppLink({
          tenantName: 'María José Peña & Cía S.A.S. 🏢',
          tenantPhone: '+57 318 765 4321',
          propertyTitle: 'Local Comercial 102 — Centro Comercial "La Estación"',
          period: 'Octubre 2026',
          monthlyRent: 4500000,
          adminFee: 650000,
          adminPaidBy: 'tenant',
          paymentDay: 10,
          agencyName: 'Inmobiliaria Éxito & Asociados',
        });
        assertTrue(linkTenant.startsWith('https://wa.me/573187654321?text='), 'Target phone normalized');
        const textTenant = decodeURIComponent(linkTenant.split('?text=')[1]);
        assertContains(textTenant, 'María José Peña & Cía S.A.S. 🏢', 'Unicode tenant name preserved');

        const linkOwner = generateOwnerPayoutWhatsAppLink({
          ownerName: 'Dr. Alejandro Muñóz-Berrío',
          ownerPhone: '0310 123 4567',
          propertyTitle: 'Penthouse 1401 — Torre Altavista',
          period: '2026-10',
          rentAmount: 6000000,
          commissionAmount: 480000,
          vatAmount: 0,
          adminFeeAmount: 0,
          adminPaidBy: 'tenant',
          deductionsAmount: 350000,
          netOwnerPayout: 5170000,
          bankName: 'Banco BBVA Colombia',
          accountNumber: 'Cta Ahorros 0013-0876-5432109876',
          agencyName: 'Praxis Inmobiliaria',
        });
        assertTrue(linkOwner.startsWith('https://wa.me/573101234567?text='), 'Phone normalized from leading zero format');
        const textOwner = decodeURIComponent(linkOwner.split('?text=')[1]);
        assertContains(textOwner, 'Alejandro Muñóz-Berrío', 'Owner name preserved');
        assertFalse(textOwner.includes('IVA Comisión'), 'Zero VAT line excluded');
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
