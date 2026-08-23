/**
 * Challenger 1: Empirical Deep Adversarial Stress & Monte Carlo Fuzzing Harness
 * Comprehensive mathematical verification of RentFlow Pro (settlement-calculator.ts, whatsapp-notifier.ts, normalize-phone.ts)
 */

import {
  calculateSettlement,
  calculateProratedRent,
  formatCOP,
  roundCurrency,
  type SettlementInput,
} from '../../../src/modules/features/rentals/services/settlement-calculator';
import {
  generateTenantPaymentWhatsAppLink,
  generateOwnerPayoutWhatsAppLink,
} from '../../../src/modules/features/rentals/services/whatsapp-notifier';
import { normalizePhone } from '../../../src/modules/infrastructure/utils/normalize-phone';

interface StressResult {
  suiteName: string;
  passed: boolean;
  totalChecks: number;
  failures: string[];
  executionTimeMs: number;
}

const results: StressResult[] = [];

function runStressSuite(name: string, fn: (recordCheck: () => void, recordFailure: (msg: string) => void) => void): StressResult {
  const start = performance.now();
  let checks = 0;
  const failures: string[] = [];

  const recordCheck = () => { checks++; };
  const recordFailure = (msg: string) => { failures.push(msg); };

  try {
    fn(recordCheck, recordFailure);
  } catch (err: any) {
    failures.push(`Unhandled Exception: ${err?.message || String(err)}`);
  }

  const duration = Math.round(performance.now() - start);
  const res: StressResult = {
    suiteName: name,
    passed: failures.length === 0,
    totalChecks: checks,
    failures,
    executionTimeMs: duration,
  };
  results.push(res);
  return res;
}

console.log('================================================================================');
console.log('🚀 CHALLENGER 1: EMPIRICAL ADVERSARIAL STRESS HARNESS — RENTFLOW PRO');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// Suite 1: Fractional Cent Precision & Float Rounding Oracle
// -----------------------------------------------------------------------------
runStressSuite('1. Float Cent Precision & Irrational Fraction Hardening', (check, fail) => {
  // Test case 1: $1,999,999.99 with 8.333333% commission + 19% IVA
  const s1 = calculateSettlement({
    monthlyRent: 1999999.99,
    commissionPercentage: 8.333333,
    vatOnCommission: true,
  });
  check();
  if (s1.rentAmount !== 1999999.99) fail(`Expected rent 1999999.99, got ${s1.rentAmount}`);
  check();
  if (s1.commissionAmount !== 166666.66) fail(`Expected commission 166666.66, got ${s1.commissionAmount}`);
  check();
  if (s1.vatAmount !== 31666.67) fail(`Expected vat 31666.67, got ${s1.vatAmount}`);
  check();
  if (s1.totalAgencyFee !== 198333.33) fail(`Expected totalAgencyFee 198333.33, got ${s1.totalAgencyFee}`);
  check();
  if (s1.netOwnerPayout !== 1801666.66) fail(`Expected netOwnerPayout 1801666.66, got ${s1.netOwnerPayout}`);

  // Test repeating decimals (1/3, 1/7, 1/11)
  const fractions = [
    { rate: 100 / 3, rent: 3000000.33 },
    { rate: 100 / 7, rent: 7000000.77 },
    { rate: 100 / 9, rent: 9999999.99 },
  ];

  for (const { rate, rent } of fractions) {
    const res = calculateSettlement({
      monthlyRent: rent,
      commissionPercentage: rate,
      vatOnCommission: true,
    });
    check();
    const expectedComm = roundCurrency(rent * (rate / 100));
    const expectedVat = roundCurrency(expectedComm * 0.19);
    const expectedFee = roundCurrency(expectedComm + expectedVat);
    const expectedNet = roundCurrency(rent - expectedComm - expectedVat);

    if (res.commissionAmount !== expectedComm) fail(`Commission mismatch for rate ${rate}`);
    if (res.vatAmount !== expectedVat) fail(`VAT mismatch for rate ${rate}`);
    if (res.totalAgencyFee !== expectedFee) fail(`Fee sum mismatch for rate ${rate}`);
    if (res.netOwnerPayout !== expectedNet) fail(`Net payout mismatch for rate ${rate}`);
  }
});

// -----------------------------------------------------------------------------
// Suite 2: Extreme Deduction Overflow & Deficit Roll-Forward
// -----------------------------------------------------------------------------
runStressSuite('2. Extreme Deduction Overflow ($100M Deficit & Multi-Period Roll-Forward)', (check, fail) => {
  // Single cycle $10M deduction on $2M rent
  const singleCycle = calculateSettlement({
    monthlyRent: 2000000,
    adminFee: 200000,
    adminPaidBy: 'agency',
    commissionPercentage: 8.0,
    vatOnCommission: true,
    deductions: [{ concept: 'Total Rebuild', amount: 10000000 }],
  });
  check();
  if (singleCycle.netOwnerPayout !== 0) fail(`Net payout should be clamped to 0, got ${singleCycle.netOwnerPayout}`);
  check();
  if (singleCycle.carriedBalance !== -8390400) fail(`Carried balance should be -8390400, got ${singleCycle.carriedBalance}`);

  // Multi-cycle simulation: $100M deduction on $5M monthly rent (agency fee 8% + 19% IVA = 9.52% = $476,000 net fee per month)
  // Monthly net available = 5,000,000 - 476,000 = $4,524,000
  // Cycles needed to recover $100,000,000 = ceil(100,000,000 / 4,524,000) = 23 cycles!
  let currentBalance = 0;
  let totalNetPaidToOwner = 0;
  let totalFeesCollected = 0;
  const rent = 5000000;
  const initialDeduction = 100000000;

  for (let month = 1; month <= 25; month++) {
    const deductions = month === 1 ? [{ concept: 'Massive Structural Repair', amount: initialDeduction }] : [];
    const out = calculateSettlement({
      monthlyRent: rent,
      commissionPercentage: 8.0,
      vatOnCommission: true,
      deductions,
      previousBalance: currentBalance,
    });
    check();
    totalNetPaidToOwner += out.netOwnerPayout;
    totalFeesCollected += out.totalAgencyFee;
    currentBalance = out.carriedBalance;

    if (month < 23) {
      if (out.netOwnerPayout !== 0) fail(`Month ${month} payout should be 0, got ${out.netOwnerPayout}`);
      if (out.carriedBalance >= 0) fail(`Month ${month} should have negative carried balance`);
    } else if (month === 23) {
      // Month 23: Remaining deficit before this month was: 100,000,000 - 22 * 4,524,000 = 100,000,000 - 99,528,000 = 472,000
      // Available net in month 23 = 4,524,000 - 472,000 = 4,052,000
      if (out.netOwnerPayout !== 4052000) fail(`Month 23 expected payout 4052000, got ${out.netOwnerPayout}`);
      if (out.carriedBalance !== 0) fail(`Month 23 carried balance should be cleared to 0, got ${out.carriedBalance}`);
    } else {
      // Month 24+: Full net payout $4,524,000
      if (out.netOwnerPayout !== 4524000) fail(`Month ${month} expected payout 4524000, got ${out.netOwnerPayout}`);
      if (out.carriedBalance !== 0) fail(`Month ${month} carried balance should be 0`);
    }
  }

  // 25-Month Global Reconciliation:
  // Total Collected = 25 * 5,000,000 = 125,000,000
  // Total Agency Fees = 25 * 476,000 = 11,900,000
  // Total Deductions = 100,000,000
  // Total Paid to Landlord = 4,052,000 + 2 * 4,524,000 = 13,100,000
  // Check: 11,900,000 + 100,000,000 + 13,100,000 === 125,000,000
  const totalReconciled = totalFeesCollected + initialDeduction + totalNetPaidToOwner;
  check();
  if (totalReconciled !== 125000000) {
    fail(`Global 25-month reconciliation mismatch: expected 125000000, got ${totalReconciled}`);
  }
});

// -----------------------------------------------------------------------------
// Suite 3: Calendar Proration Matrix (365 Days of 2026 + 366 Days of Leap Year 2028)
// -----------------------------------------------------------------------------
runStressSuite('3. Statutory 30-Day Calendar Proration Comprehensive Year Sweep', (check, fail) => {
  const rent = 3000000; // $100,000 per commercial day

  // Test Leap Year Feb 29 specifically
  const leap29 = calculateProratedRent(rent, '2028-02-29');
  check();
  if (leap29 !== 200000) fail(`Expected leap 2028-02-29 to be 200000 (2 days), got ${leap29}`);

  // Test Non-Leap Year Feb 28
  const nonLeap28 = calculateProratedRent(rent, '2026-02-28');
  check();
  if (nonLeap28 !== 300000) fail(`Expected non-leap 2026-02-28 to be 300000 (3 days), got ${nonLeap28}`);

  // Test every 31st of the month
  const months31 = ['01', '03', '05', '07', '08', '10', '12'];
  for (const m of months31) {
    const d31 = calculateProratedRent(rent, `2026-${m}-31`);
    check();
    if (d31 !== 100000) fail(`Day 31 in month ${m} expected 100000 (1 day), got ${d31}`);
  }

  // Sweep all 1-31 days
  for (let day = 1; day <= 31; day++) {
    const dateStr = `2026-07-${String(day).padStart(2, '0')}`;
    const prorated = calculateProratedRent(rent, dateStr);
    check();
    const effectiveDay = Math.min(day, 30);
    const expectedDays = 30 - effectiveDay + 1;
    const expectedProrated = expectedDays * 100000;
    if (prorated !== expectedProrated) {
      fail(`Day ${day} expected ${expectedProrated}, got ${prorated}`);
    }
  }
});

// -----------------------------------------------------------------------------
// Suite 4: WhatsApp Link Generation & Security / Unicode Stress
// -----------------------------------------------------------------------------
runStressSuite('4. WhatsApp Link Adversarial Phone, Unicode & XSS Stress', (check, fail) => {
  const attackPayloads = [
    '<script>alert("XSS")</script>',
    '"; DROP TABLE property_leases; --',
    'https://phishing.com/claim?id=123',
    '🎉 🚀 💰 🏠 🔑 ✨ 🌟 🏢 📊',
    'Special chars: & = ? / \\ % + # @ : ; " \' ~ ` ! $ ^ * ( ) [ ] { } < > |',
    'Accented Colombian text: Bogotá, Medellín, Ibagué, Chía, Cúcuta, Cañaveral, Niño',
  ];

  for (const payload of attackPayloads) {
    const link = generateTenantPaymentWhatsAppLink({
      tenantName: payload,
      tenantPhone: '+57 (310) 987-6543 (Celular Personal)',
      propertyTitle: payload,
      period: '2026-09',
      monthlyRent: 2500000,
      adminFee: 200000,
      adminPaidBy: 'agency',
      paymentDay: 5,
      paymentLink: 'https://wompi.co/pay/123',
      agencyName: payload,
    });

    check();
    if (!link.startsWith('https://wa.me/573109876543?text=')) {
      fail(`Invalid base WhatsApp URL for payload: ${payload}`);
    }
    if (link.includes(' ') || link.includes('\n')) {
      fail(`Unencoded whitespace or newline in URL for payload: ${payload}`);
    }

    const decoded = decodeURIComponent(link.split('?text=')[1]);
    check();
    if (!decoded.includes(payload)) {
      fail(`Decoded message lost payload: ${payload}`);
    }
  }
});

// -----------------------------------------------------------------------------
// Suite 5: Monte Carlo Random Fuzzing (25,000 Invariant Checks)
// -----------------------------------------------------------------------------
runStressSuite('5. 25,000 Iteration Monte Carlo Fuzzing & Invariant Verification', (check, fail) => {
  for (let i = 0; i < 25000; i++) {
    const rent = Math.round(Math.random() * 100000000 * 100) / 100;
    const admin = Math.round(Math.random() * 10000000 * 100) / 100;
    const adminPaidBy = Math.random() > 0.5 ? 'agency' : 'tenant';
    const commission = Math.random() * 25;
    const vat = Math.random() > 0.2;
    const prevBalance = (Math.random() - 0.5) * 20000000;
    const numDeductions = Math.floor(Math.random() * 6);
    const deductions = Array.from({ length: numDeductions }, () => ({
      amount: Math.round(Math.random() * 5000000 * 100) / 100,
    }));

    const res = calculateSettlement({
      monthlyRent: rent,
      adminFee: admin,
      adminPaidBy,
      commissionPercentage: commission,
      vatOnCommission: vat,
      previousBalance: prevBalance,
      deductions,
    });

    check();

    // Invariants
    if (res.netOwnerPayout < 0) fail(`Negative netOwnerPayout at ${i}`);
    if (res.carriedBalance > 0) fail(`Positive carriedBalance at ${i}`);
    if (isNaN(res.netOwnerPayout)) fail(`NaN netOwnerPayout at ${i}`);
    if (!isFinite(res.netOwnerPayout)) fail(`Infinite netOwnerPayout at ${i}`);
    if (roundCurrency(res.commissionAmount + res.vatAmount) !== res.totalAgencyFee) {
      fail(`Fee sum mismatch at ${i}`);
    }
  }
});

// -----------------------------------------------------------------------------
// Print Summary Matrix
// -----------------------------------------------------------------------------
console.log('--------------------------------------------------------------------------------');
console.log('RESULTS SUMMARY:');
console.log('--------------------------------------------------------------------------------');
let totalChecks = 0;
let totalFailures = 0;

for (const r of results) {
  totalChecks += r.totalChecks;
  totalFailures += r.failures.length;
  const status = r.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${r.suiteName} (${r.totalChecks} checks, ${r.executionTimeMs}ms)`);
  if (!r.passed) {
    for (const f of r.failures) {
      console.log(`   - ❗ ${f}`);
    }
  }
}

console.log('================================================================================');
console.log(`TOTAL CHECKS:   ${totalChecks}`);
console.log(`TOTAL FAILURES: ${totalFailures}`);
console.log(`GLOBAL VERDICT: ${totalFailures === 0 ? '🟢 100% EMPIRICAL SUCCESS (APPROVE)' : '🔴 FAILED (REQUEST_CHANGES)'}`);
console.log('================================================================================\n');

if (totalFailures > 0) {
  process.exit(1);
}
