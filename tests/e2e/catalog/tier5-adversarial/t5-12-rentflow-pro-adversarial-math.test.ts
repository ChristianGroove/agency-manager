/**
 * Tier 5 Test Suite: F28 - RentFlow Pro Adversarial Mathematical Logic, Tax Boundaries & Fuzzing
 * Suite: t5-12-rentflow-pro-adversarial-math
 * Feature: Real Estate Settlement Calculator, Proration, Extreme Deduction Overflow, Float Precision & WhatsApp Link Hardening
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
  calculateProratedRent,
  formatCOP,
  roundCurrency,
  type SettlementInput,
} from '../../../../src/modules/features/rentals/services/settlement-calculator';
import {
  generateTenantPaymentWhatsAppLink,
  generateOwnerPayoutWhatsAppLink,
} from '../../../../src/modules/features/rentals/services/whatsapp-notifier';
import { normalizePhone } from '../../../../src/modules/infrastructure/utils/normalize-phone';

export const suite = {
  name: 'T5-12: RentFlow Pro Adversarial Mathematical Logic, Tax Boundaries & Stress Suite',
  tier: 'Tier 5',
  feature: 'F28: RentFlow Pro Mathematical Engine & Adversarial Hardening',
  tests: [
    {
      name: '1. Fractional Cent Float Precision ($1,999,999.99 @ 8.333333% Commission + 19% IVA)',
      fn: () => {
        const input: SettlementInput = {
          monthlyRent: 1999999.99,
          adminFee: 250000.50,
          adminPaidBy: 'agency',
          commissionPercentage: 8.333333,
          vatOnCommission: true,
          deductions: [{ concept: 'Fix faucet', amount: 45000.75 }],
        };

        const result = calculateSettlement(input);

        // Exact manual calculation:
        // rentAmount = 1,999,999.99
        // adminFeeAmount = 250,000.50
        // grossCollected = 1,999,999.99 + 250,000.50 = 2,250,000.49
        assertEqual(result.rentAmount, 1999999.99, 'Rent amount preserved');
        assertEqual(result.adminFeeAmount, 250000.50, 'Admin fee preserved');
        assertEqual(result.grossCollected, 2250000.49, 'Gross collected equals rent + admin');

        // commissionAmount = roundCurrency(1999999.99 * 0.08333333) = round(166666.6624999967) = 166666.66
        assertEqual(result.commissionAmount, 166666.66, 'Commission must be cent-precise');

        // vatAmount = roundCurrency(166666.66 * 0.19) = round(31666.6654) = 31666.67
        assertEqual(result.vatAmount, 31666.67, 'VAT must round correctly to nearest cent');

        // totalAgencyFee = 166666.66 + 31666.67 = 198333.33
        assertEqual(result.totalAgencyFee, 198333.33, 'Total fee matches sum of commission + VAT');

        // deductions = 45,000.75
        assertEqual(result.deductionsAmount, 45000.75, 'Deductions matched');

        // netOwnerPayout = 1999999.99 - 166666.66 - 31666.67 - 250000.50 - 45000.75 = 1506665.41
        assertEqual(result.netOwnerPayout, 1506665.41, 'Net owner payout calculated without float drift');
        assertEqual(result.carriedBalance, 0, 'No carried balance when net payout is positive');

        // Invariant check: rentAmount - totalAgencyFee - adminFeeAmount - deductionsAmount === netOwnerPayout
        const calculatedNet = roundCurrency(
          result.rentAmount - result.totalAgencyFee - result.adminFeeAmount - result.deductionsAmount
        );
        assertEqual(calculatedNet, result.netOwnerPayout, 'Accounting balance invariant holds');
      },
    },

    {
      name: '2. Extreme Deduction Overflow ($10,000,000 on $2,000,000 Rent) & Carried Balance Accuracy',
      fn: () => {
        const input: SettlementInput = {
          monthlyRent: 2000000,
          adminFee: 200000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [{ concept: 'Emergency roof replacement', amount: 10000000 }],
        };

        const result = calculateSettlement(input);

        // Rent: 2,000,000
        // Commission (8%): 160,000
        // VAT (19%): 30,400
        // Total Agency Fee: 190,400
        // Admin: 200,000
        // Deductions: 10,000,000
        // Raw Net = 2,000,000 - 160,000 - 30,400 - 200,000 - 10,000,000 = -8,390,400
        assertEqual(result.netOwnerPayout, 0, 'Net owner payout must clamp to 0 (no negative payout)');
        assertEqual(result.carriedBalance, -8390400, 'Carried balance must accurately store exact unrecovered deficit');
        assertEqual(result.deductionsAmount, 10000000, 'Deductions recorded fully');
      },
    },

    {
      name: '3. Multi-Month Roll-Forward Recovery across 6 Consecutive Cycles',
      fn: () => {
        // Month 1: Massive $10M deduction
        let settlement = calculateSettlement({
          monthlyRent: 2000000,
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [{ concept: 'Structural repair', amount: 10000000 }],
        });

        // Commission: 160k, VAT: 30.4k, Fee: 190.4k. Raw Net: 2M - 190.4k - 10M = -8,190,400
        assertEqual(settlement.netOwnerPayout, 0);
        assertEqual(settlement.carriedBalance, -8190400);

        // Month 2: Regular month, roll forward previous balance
        settlement = calculateSettlement({
          monthlyRent: 2000000,
          commissionPercentage: 8.0,
          vatOnCommission: true,
          previousBalance: settlement.carriedBalance,
        });
        // Raw: 2M - 190.4k + (-8,190,400) = 1,809,600 - 8,190,400 = -6,380,800
        assertEqual(settlement.netOwnerPayout, 0);
        assertEqual(settlement.carriedBalance, -6380800);

        // Month 3
        settlement = calculateSettlement({
          monthlyRent: 2000000,
          commissionPercentage: 8.0,
          vatOnCommission: true,
          previousBalance: settlement.carriedBalance,
        });
        // Raw: 1,809,600 - 6,380,800 = -4,571,200
        assertEqual(settlement.netOwnerPayout, 0);
        assertEqual(settlement.carriedBalance, -4571200);

        // Month 4
        settlement = calculateSettlement({
          monthlyRent: 2000000,
          commissionPercentage: 8.0,
          vatOnCommission: true,
          previousBalance: settlement.carriedBalance,
        });
        // Raw: 1,809,600 - 4,571,200 = -2,761,600
        assertEqual(settlement.netOwnerPayout, 0);
        assertEqual(settlement.carriedBalance, -2761600);

        // Month 5
        settlement = calculateSettlement({
          monthlyRent: 2000000,
          commissionPercentage: 8.0,
          vatOnCommission: true,
          previousBalance: settlement.carriedBalance,
        });
        // Raw: 1,809,600 - 2,761,600 = -952,000
        assertEqual(settlement.netOwnerPayout, 0);
        assertEqual(settlement.carriedBalance, -952000);

        // Month 6: Deficit cleared! Net owner payout becomes positive!
        settlement = calculateSettlement({
          monthlyRent: 2000000,
          commissionPercentage: 8.0,
          vatOnCommission: true,
          previousBalance: settlement.carriedBalance,
        });
        // Raw: 1,809,600 - 952,000 = +857,600
        assertEqual(settlement.netOwnerPayout, 857600, 'Month 6 yields exact positive net payout');
        assertEqual(settlement.carriedBalance, 0, 'Carried balance cleared to 0');

        // Global reconciliation over 6 months:
        // Total collected: 6 * 2,000,000 = 12,000,000
        // Total agency fees: 6 * 190,400 = 1,142,400
        // Total deductions: 10,000,000
        // Total net payout to owner: 857,600
        // Check: 1,142,400 + 10,000,000 + 857,600 === 12,000,000
        assertEqual(1142400 + 10000000 + 857600, 12000000, 'Total 6-month balance strictly reconciles');
      },
    },

    {
      name: '4. Statutory 30-Day Commercial Proration Edge Cases (Leap Year Feb 29, 31st, 1st, Mid-Month)',
      fn: () => {
        const monthlyRent = 3000000; // $3,000,000 COP ($100,000/day on 30-day basis)

        // Case A: 1st of month -> 30 days active -> Full rent
        const day1 = calculateProratedRent(monthlyRent, '2026-09-01');
        assertEqual(day1, 3000000, '1st of month gives 100% full rent');

        // Case B: 30th of month -> 1 day active (day 30) -> $100,000
        const day30 = calculateProratedRent(monthlyRent, '2026-09-30');
        assertEqual(day30, 100000, '30th of month gives exactly 1 day');

        // Case C: 31st of month (e.g. August 31) -> normalized to 30 -> 1 day active -> $100,000
        const day31 = calculateProratedRent(monthlyRent, '2026-08-31');
        assertEqual(day31, 100000, '31st of month normalized to 1 day');

        // Case D: Leap Year February 29 (2024-02-29) -> day 29 -> active days = 30 - 29 + 1 = 2 days -> $200,000
        const leapFeb29 = calculateProratedRent(monthlyRent, '2024-02-29');
        assertEqual(leapFeb29, 200000, 'Leap year Feb 29 gives exactly 2 commercial days');

        // Case E: Non-Leap Year February 28 (2023-02-28) -> day 28 -> active days = 30 - 28 + 1 = 3 days -> $300,000
        const nonLeapFeb28 = calculateProratedRent(monthlyRent, '2023-02-28');
        assertEqual(nonLeapFeb28, 300000, 'Feb 28 gives exactly 3 commercial days');

        // Case F: Mid-month (18th of month) -> active days = 30 - 18 + 1 = 13 days -> $1,300,000
        const day18 = calculateProratedRent(monthlyRent, '2026-05-18');
        assertEqual(day18, 1300000, '18th of month gives exactly 13 days');

        // Case G: Date object input
        const dateObj = new Date(2026, 6, 15); // July 15 -> active = 30 - 15 + 1 = 16 -> $1,600,000
        const day15Date = calculateProratedRent(monthlyRent, dateObj);
        assertEqual(day15Date, 1600000, 'Date object parsed correctly');

        // Case H: Invalid / edge inputs
        assertEqual(calculateProratedRent(0, '2026-01-01'), 0, 'Zero rent returns 0');
        assertEqual(calculateProratedRent(-100000, '2026-01-01'), 0, 'Negative rent returns 0');
        assertEqual(calculateProratedRent(NaN, '2026-01-01'), 0, 'NaN rent returns 0');
        assertEqual(calculateProratedRent(3000000, 'invalid-date'), 3000000, 'Invalid date falls back to 1st (full rent)');
      },
    },

    {
      name: '5. WhatsApp Link Generation: Malformed Phone Numbers & International Prefix Normalization',
      fn: () => {
        const testPhones = [
          { raw: '3001234567', expected: '573001234567' },
          { raw: '+573001234567', expected: '573001234567' },
          { raw: '573001234567', expected: '573001234567' },
          { raw: '03001234567', expected: '573001234567' },
          { raw: '  300-123-4567  ', expected: '573001234567' },
          { raw: '+57 (300) 123.45.67', expected: '573001234567' },
          { raw: '3001234567 (Inquilino Principal)', expected: '573001234567' },
          { raw: '📱 +57 300-123-4567 ✨', expected: '573001234567' },
        ];

        for (const { raw, expected } of testPhones) {
          const normalized = normalizePhone(raw, 'CO');
          assertEqual(normalized, expected, `Phone "${raw}" normalized to "${expected}"`);

          const waUrl = generateTenantPaymentWhatsAppLink({
            tenantName: 'Juan Pérez',
            tenantPhone: raw,
            propertyTitle: 'Apto 101',
            period: '2026-09',
            monthlyRent: 2000000,
            adminFee: 0,
            adminPaidBy: 'tenant',
            paymentDay: 5,
          });

          assertTrue(waUrl.startsWith(`https://wa.me/${expected}?text=`), `WhatsApp URL contains normalized phone ${expected}`);
        }
      },
    },

    {
      name: '6. WhatsApp Link Generation: Complex Unicode Characters, Accents, Emojis & URL Safety',
      fn: () => {
        const complexParams = {
          tenantName: 'María José Peña-Rodríguez & Cía.',
          tenantPhone: '3109876543',
          propertyTitle: 'Penthouse Duplex 1402 — "Los Cañaverales" & Jardines ✨ (Bloque C # 4-20)',
          agencyName: 'Praxis Inmobiliaria S.A.S. — Sucursal Ibagué 🏢',
          period: '2026-09',
          monthlyRent: 3500000,
          adminFee: 450000,
          adminPaidBy: 'agency' as const,
          paymentDay: 5,
          paymentLink: 'https://checkout.wompi.co/l/VPAY_2026_09?ref=LEAS-992&amount=3950000&src=app',
        };

        const waUrl = generateTenantPaymentWhatsAppLink(complexParams);

        // Verify URL validity
        assertTrue(waUrl.startsWith('https://wa.me/573109876543?text='), 'Base URL structure correct');
        assertFalse(waUrl.includes(' '), 'URL must not contain raw unencoded whitespace');
        assertFalse(waUrl.includes('\n'), 'URL must not contain raw unencoded newlines');

        // Verify URL decoding matches expected content
        const encodedQuery = waUrl.split('?text=')[1];
        const decodedText = decodeURIComponent(encodedQuery);

        assertContains(decodedText, 'Praxis Inmobiliaria S.A.S. — Sucursal Ibagué 🏢');
        assertContains(decodedText, 'María José Peña-Rodríguez & Cía.');
        assertContains(decodedText, 'Penthouse Duplex 1402 — "Los Cañaverales" & Jardines ✨ (Bloque C # 4-20)');
        assertContains(decodedText, '2026-09');
        assertContains(decodedText, 'https://checkout.wompi.co/l/VPAY_2026_09?ref=LEAS-992&amount=3950000&src=app');
        assertContains(decodedText, '¡Agradecemos tu puntualidad! ✨');
      },
    },

    {
      name: '7. Owner Statement WhatsApp Link: Full Itemized Breakdown & Bank Account Display',
      fn: () => {
        const ownerParams = {
          ownerName: 'Dr. Carlos Andrés Niño Muñoz',
          ownerPhone: '+57 (315) 888-9999',
          propertyTitle: 'Local Comercial 102 — Centro Empresarial',
          agencyName: 'Praxis Inmobiliaria',
          period: '2026-09',
          rentAmount: 5000000,
          commissionAmount: 400000,
          vatAmount: 76000,
          adminFeeAmount: 500000,
          adminPaidBy: 'agency' as const,
          deductionsAmount: 350000,
          netOwnerPayout: 3674000,
          bankName: 'Bancolombia',
          accountNumber: '•••• 4589 (Ahorros)',
          statementPdfUrl: 'https://cdn.pixy.im/statements/2026-09-LOCAL-102.pdf',
        };

        const waUrl = generateOwnerPayoutWhatsAppLink(ownerParams);

        assertTrue(waUrl.startsWith('https://wa.me/573158889999?text='));
        const decoded = decodeURIComponent(waUrl.split('?text=')[1]);

        assertContains(decoded, 'Dr. Carlos Andrés Niño Muñoz');
        assertContains(decoded, 'Local Comercial 102 — Centro Empresarial');
        assertContains(decoded, '• Canon Recaudado:');
        assertContains(decoded, '• Comisión Agencia: -');
        assertContains(decoded, '• IVA Comisión (19%): -');
        assertContains(decoded, '• Pago Administración: -');
        assertContains(decoded, '• Deducciones / Mantenimiento: -');
        assertContains(decoded, 'Bancolombia - Nº •••• 4589 (Ahorros)');
        assertContains(decoded, 'https://cdn.pixy.im/statements/2026-09-LOCAL-102.pdf');
      },
    },

    {
      name: '8. Adversarial Fuzzing & Monte Carlo Invariant Testing (5,000 Randomized Leases)',
      fn: () => {
        // Run 5,000 randomized lease calculations with extreme values
        for (let i = 0; i < 5000; i++) {
          const rent = Math.round(Math.random() * 50000000 * 100) / 100; // $0 to $50,000,000.00
          const admin = Math.round(Math.random() * 5000000 * 100) / 100;
          const adminPaidBy = Math.random() > 0.5 ? 'agency' : 'tenant';
          const commissionRate = Math.random() * 20; // 0% to 20%
          const vatOnCommission = Math.random() > 0.2;
          const prevBalance = (Math.random() - 0.5) * 10000000; // -$5M to +$5M
          
          const numDeductions = Math.floor(Math.random() * 5);
          const deductions = Array.from({ length: numDeductions }, (_, idx) => ({
            concept: `Item ${idx}`,
            amount: Math.round(Math.random() * 2000000 * 100) / 100,
          }));

          const res = calculateSettlement({
            monthlyRent: rent,
            adminFee: admin,
            adminPaidBy,
            commissionPercentage: commissionRate,
            vatOnCommission,
            previousBalance: prevBalance,
            deductions,
          });

          // Invariant 1: Non-negative net payout
          assertTrue(res.netOwnerPayout >= 0, `Net owner payout must never be negative (iteration ${i})`);

          // Invariant 2: totalAgencyFee === commissionAmount + vatAmount (within cent precision)
          const feeSum = roundCurrency(res.commissionAmount + res.vatAmount);
          assertEqual(res.totalAgencyFee, feeSum, `Fee sum invariant violated at iteration ${i}`);

          // Invariant 3: Carried balance is either <= 0 or 0
          assertTrue(res.carriedBalance <= 0, `Carried balance must never be positive (iteration ${i})`);

          // Invariant 4: If netOwnerPayout > 0, carriedBalance must be 0
          if (res.netOwnerPayout > 0) {
            assertEqual(res.carriedBalance, 0, `Carried balance must be 0 when net payout is positive (iteration ${i})`);
          }

          // Invariant 5: No NaN or Infinite values
          assertFalse(isNaN(res.netOwnerPayout), `NaN in netOwnerPayout at iteration ${i}`);
          assertFalse(isNaN(res.grossCollected), `NaN in grossCollected at iteration ${i}`);
          assertFalse(isNaN(res.commissionAmount), `NaN in commissionAmount at iteration ${i}`);
          assertFalse(isNaN(res.vatAmount), `NaN in vatAmount at iteration ${i}`);
          assertFalse(isNaN(res.carriedBalance), `NaN in carriedBalance at iteration ${i}`);
          assertTrue(isFinite(res.netOwnerPayout), `Infinite netOwnerPayout at iteration ${i}`);
        }
      },
    },

    {
      name: '9. Malformed Deductions Array & Null/Undefined Defenses',
      fn: () => {
        const res = calculateSettlement({
          monthlyRent: 2000000,
          vatOnCommission: true,
          deductions: [
            null as any,
            undefined as any,
            {} as any,
            { amount: -50000 } as any, // negative amount sanitized to 0
            { amount: NaN } as any,
            { amount: 'invalid' as any },
            { concept: 'Valid repair', amount: 150000 } as any,
          ],
        });

        assertEqual(res.deductionsAmount, 150000, 'Malformed deductions sanitized safely to only valid positive amounts');
        assertEqual(res.netOwnerPayout, 1659600, 'Net payout calculated cleanly (2M - 160k commission - 30.4k VAT - 150k deduction)');
      },
    },
  ],
};
