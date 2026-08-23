// ==============================================================================
// PIXY RENTFLOW PRO — PURE SETTLEMENT MATHEMATICAL ENGINE & FORMATTERS
// Module: module_rentals (Real Estate Space)
// Path: src/modules/features/rentals/services/settlement-calculator.ts
// ==============================================================================

import type { AdminPaidBy } from '@/types/rentals';

/**
 * Itemized maintenance or repair deduction item
 */
export interface DeductionItem {
  id?: string;
  concept: string;
  amount: number;
  category?: 'maintenance' | 'repairs' | 'repair' | 'utilities' | 'utility' | 'legal' | 'taxes' | 'tax' | 'other' | string;
  date?: string;
  notes?: string;
  invoice_url?: string;
  receipt_url?: string;
}

/**
 * Input for monthly rental settlement calculation engine
 */
export interface SettlementInput {
  monthlyRent: number;
  adminFee?: number;
  adminPaidBy?: AdminPaidBy | 'agency' | 'tenant';
  commissionPercentage?: number;
  vatOnCommission?: boolean;
  deductions?: DeductionItem[] | Array<{ amount: number }>;
  previousBalance?: number;
}

/**
 * Calculation result with complete financial breakdown
 */
export interface SettlementOutput {
  rentAmount: number;
  adminFeeAmount: number;
  grossCollected: number;
  commissionAmount: number;
  vatAmount: number;
  totalAgencyFee: number;
  deductionsAmount: number;
  netOwnerPayout: number;
  carriedBalance: number;
}

// Backwards-compatible aliases for legacy imports
export type CalculationInput = SettlementInput;
export type CalculationResult = SettlementOutput;

/**
 * Standard rounding to 2 decimal places (cent precision) avoiding floating-point drift
 */
export const roundCurrency = (num: number): number => {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Calculate prorated rent adhering to Colombian statutory commercial 30-day daily proration.
 * Formula: Math.round((monthlyRent / billingMonthDays) * activeDays)
 * 
 * In Colombian commercial accounting (Law 820 of 2003):
 * - Each commercial month is standardized to 30 days (billingMonthDays = 30)
 * - If a lease begins on day D of the month, active days = Math.max(0, billingMonthDays - D + 1)
 * - For example, starting on the 18th of the month: activeDays = 30 - 18 + 1 = 13 days.
 * - If starting on the 1st: activeDays = 30 - 1 + 1 = 30 days (full monthly rent).
 * - If starting on the 30th or 31st: activeDays = 1 day.
 * 
 * @param monthlyRent - Full monthly rent amount
 * @param startDate - Contract start date (ISO string 'YYYY-MM-DD' or Date object)
 * @param billingMonthDays - Commercial billing month days (default: 30)
 * @returns Prorated rent rounded to nearest peso / cent
 */
export function calculateProratedRent(
  monthlyRent: number,
  startDate: string | Date,
  billingMonthDays: number = 30
): number {
  if (isNaN(monthlyRent) || !isFinite(monthlyRent) || monthlyRent <= 0) return 0;
  if (!billingMonthDays || billingMonthDays <= 0) billingMonthDays = 30;

  let day = 1;
  if (typeof startDate === 'string') {
    const match = startDate.match(/^\d{4}-\d{2}-(\d{2})/);
    if (match) {
      day = parseInt(match[1], 10);
    } else {
      const parsed = new Date(startDate);
      day = isNaN(parsed.getTime()) ? 1 : parsed.getDate();
    }
  } else if (startDate instanceof Date) {
    day = isNaN(startDate.getTime()) ? 1 : startDate.getDate();
  }

  // Normalize day to commercial month boundary (1 to billingMonthDays)
  const normalizedDay = Math.min(Math.max(1, day), billingMonthDays);
  const activeDays = Math.max(0, billingMonthDays - normalizedDay + 1);

  // Colombian commercial 30-day daily proration
  const prorated = Math.round((monthlyRent / billingMonthDays) * activeDays);
  return roundCurrency(prorated);
}

/**
 * Pure calculation engine for monthly rental billing and landlord payout settlements.
 * 
 * Statutory & Real Estate Industry Rules (Colombia / Law 820 of 2003):
 * 1. Gross Collected = Monthly Rent + (Admin Fee if collected by agency)
 * 2. Commission Amount = Monthly Rent * (Commission Rate / 100) [Default 8.00%]
 * 3. VAT Amount = Commission Amount * 0.19 (if vat_on_commission = true) [19% IVA]
 * 4. Total Agency Fee = Commission Amount + VAT Amount
 * 5. Deductions Amount = Sum of all approved maintenance/repair items
 * 6. Net Owner Payout = Monthly Rent - Commission Amount - VAT Amount - (Admin Fee if paid by agency) - Deductions + Previous Balance
 *    Clamped to Math.max(0, rawNetOwnerPayout)
 * 7. Carried Balance = If rawNetOwnerPayout < 0, negative balance carried forward to subsequent months (otherwise 0).
 */
export function calculateSettlement(input: SettlementInput): SettlementOutput {
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

  // 4. Previous Balance (Carried balance from prior months)
  const previousBalance = typeof input.previousBalance === 'number' && !isNaN(input.previousBalance) && isFinite(input.previousBalance)
    ? roundCurrency(input.previousBalance)
    : 0;

  // 5. Net Owner Payout & Carried Balance
  // If admin is paid by agency to condominium management, it is deducted from the rent before paying the owner
  const adminAgencyDeduction = input.adminPaidBy === 'agency' ? adminFeeAmount : 0;
  const rawNetOwnerPayout = rentAmount - commissionAmount - vatAmount - adminAgencyDeduction - deductionsAmount + previousBalance;
  
  const netOwnerPayout = roundCurrency(Math.max(0, rawNetOwnerPayout));
  const carriedBalance = rawNetOwnerPayout < 0 ? roundCurrency(rawNetOwnerPayout) : 0;

  return {
    rentAmount,
    adminFeeAmount,
    grossCollected,
    commissionAmount,
    vatAmount,
    totalAgencyFee,
    deductionsAmount,
    netOwnerPayout,
    carriedBalance,
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
