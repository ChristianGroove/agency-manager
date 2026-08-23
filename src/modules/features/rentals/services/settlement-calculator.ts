// ==============================================================================
// PIXY RENTFLOW PRO — PURE SETTLEMENT MATHEMATICAL ENGINE & FORMATTERS
// Module: module_rentals (Real Estate Space)
// Path: src/modules/features/rentals/services/settlement-calculator.ts
// ==============================================================================

import type { CalculationInput, CalculationResult } from '../types/rentals.types';

/**
 * Standard rounding to 2 decimal places (cent precision) avoiding floating-point drift
 */
export const roundCurrency = (num: number): number => {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Pure calculation engine for monthly rental billing and landlord payout settlements.
 * 
 * Statutory & Real Estate Industry Rules (Colombia / Law 820 of 2003):
 * 1. Gross Collected = Monthly Rent + (Admin Fee if collected by agency)
 * 2. Commission Amount = Monthly Rent * (Commission Rate / 100) [Default 8.00%]
 * 3. VAT Amount = Commission Amount * 0.19 (if vat_on_commission = true) [19% IVA]
 * 4. Total Agency Fee = Commission Amount + VAT Amount
 * 5. Deductions Amount = Sum of all approved maintenance/repair items
 * 6. Net Owner Payout = Monthly Rent - Commission Amount - VAT Amount - (Admin Fee if paid by agency) - Deductions
 *    Clamped to Math.max(0, netOwnerPayout)
 */
export function calculateSettlement(input: CalculationInput): CalculationResult {
  const rentAmount = roundCurrency(Math.max(0, input.monthlyRent || 0));
  const adminFeeAmount = roundCurrency(Math.max(0, input.adminFee || 0));
  const commissionPercentage = typeof input.commissionPercentage === 'number' ? input.commissionPercentage : 8.0;
  const commissionRate = Math.max(0, commissionPercentage) / 100;

  // 1. Gross Collected (Total collected by agency from tenant)
  const grossCollected = input.adminPaidBy === 'agency'
    ? roundCurrency(rentAmount + adminFeeAmount)
    : rentAmount;

  // 2. Agency Commission & VAT
  const commissionAmount = roundCurrency(rentAmount * commissionRate);
  const vatAmount = input.vatOnCommission ? roundCurrency(commissionAmount * 0.19) : 0;
  const totalAgencyFee = roundCurrency(commissionAmount + vatAmount);

  // 3. Deductions (Maintenance, repairs, withholdings)
  const deductionsList = Array.isArray(input.deductions) ? input.deductions : [];
  const deductionsAmount = roundCurrency(
    deductionsList.reduce((acc, d) => acc + (Math.max(0, Number(d?.amount)) || 0), 0)
  );

  // 4. Net Owner Payout
  // If admin is paid by agency to condominium management, it is deducted from the rent before paying the owner
  const adminAgencyDeduction = input.adminPaidBy === 'agency' ? adminFeeAmount : 0;
  const rawNetOwnerPayout = rentAmount - commissionAmount - vatAmount - adminAgencyDeduction - deductionsAmount;
  const netOwnerPayout = roundCurrency(Math.max(0, rawNetOwnerPayout));

  return {
    rentAmount,
    adminFeeAmount,
    grossCollected,
    commissionAmount,
    vatAmount,
    totalAgencyFee,
    deductionsAmount,
    netOwnerPayout,
  };
}

/**
 * Format currency amount as Colombian Pesos (COP) without decimals
 * Example: 2500000 -> "$ 2.500.000" (or "$2.500.000" according to es-CO locale)
 */
export function formatCOP(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\u00a0/g, ' ');
}
