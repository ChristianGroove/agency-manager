// ==============================================================================
// PIXY RENTFLOW PRO — MODULE RENTALS TYPES & INTERFACES
// Module: module_rentals (Real Estate Space)
// Path: src/modules/features/rentals/types/rentals.types.ts
// ==============================================================================

import type {
  LeaseStatus,
  GuaranteeType,
  AdminPaidBy,
  TenantPaymentStatus,
  OwnerPayoutStatus,
  BankPayoutDetails,
  GuaranteeDetails,
  SettlementDeduction,
  PropertyLease,
  PropertyLeaseSettlement,
} from '@/types/rentals';

// Re-export all domain types from centralized @/types/rentals
export * from '@/types/rentals';

/**
 * DeductionItem alias for flexible naming and backwards compatibility
 */
export type DeductionItem = SettlementDeduction;

/**
 * Standardized Next.js Server Action Response
 */
export type ActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Input for pure settlement math engine
 */
export interface CalculationInput {
  monthlyRent: number;
  adminFee: number;
  adminPaidBy: AdminPaidBy;
  commissionPercentage: number;
  vatOnCommission: boolean;
  deductions?: Array<{ amount: number }>;
}

/**
 * Result from pure settlement math engine
 */
export interface CalculationResult {
  rentAmount: number;
  adminFeeAmount: number;
  grossCollected: number;
  commissionAmount: number;
  vatAmount: number;
  totalAgencyFee: number;
  deductionsAmount: number;
  netOwnerPayout: number;
}

/**
 * Tenant payment reminder WhatsApp notification parameters
 */
export interface TenantPaymentReminderParams {
  tenantName: string;
  tenantPhone: string;
  propertyTitle: string;
  period: string; // e.g. "Septiembre 2026" or "2026-09"
  monthlyRent: number;
  adminFee: number;
  adminPaidBy: AdminPaidBy;
  paymentDay: number;
  paymentLink?: string;
  agencyName?: string;
}

/**
 * Owner payout statement WhatsApp notification parameters
 */
export interface OwnerPayoutNotificationParams {
  ownerName: string;
  ownerPhone: string;
  propertyTitle: string;
  period: string;
  rentAmount: number;
  commissionAmount: number;
  vatAmount: number;
  adminFeeAmount: number;
  adminPaidBy: AdminPaidBy;
  deductionsAmount: number;
  netOwnerPayout: number;
  bankName: string;
  accountNumber: string;
  statementPdfUrl?: string;
  agencyName?: string;
}

/**
 * Input payload to create a new property lease
 */
export interface CreateLeaseInput {
  organization_id?: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  co_signer_id?: string | null;
  monthly_rent: number;
  admin_fee?: number;
  admin_paid_by?: AdminPaidBy;
  commission_percentage?: number;
  vat_on_commission?: boolean;
  deposit_amount?: number;
  payment_day?: number;
  payout_day?: number;
  start_date: string;
  end_date: string;
  status?: LeaseStatus;
  guarantee_type?: GuaranteeType;
  guarantee_details?: GuaranteeDetails;
  bank_payout_details: BankPayoutDetails;
  notes?: string | null;
}

/**
 * Input payload to update an existing property lease
 */
export interface UpdateLeaseInput extends Partial<CreateLeaseInput> {
  id: string;
}

/**
 * Input payload to log/record tenant rental payment
 */
export interface RecordTenantPaymentInput {
  settlement_id: string;
  paid_at?: string;
  payment_proof_url?: string | null;
  payment_method?: string;
  notes?: string | null;
}

/**
 * Input payload to record owner payout disbursement
 */
export interface RecordOwnerPayoutInput {
  settlement_id: string;
  paid_at?: string;
  statement_pdf_url?: string | null;
  payment_proof_url?: string | null;
  transaction_reference?: string | null;
  receipt_number?: string | null;
  notes?: string | null;
}

/**
 * Itemized maintenance/repair deduction input
 */
export interface DeductionInput {
  id?: string;
  concept: string;
  amount: number;
  category?: 'maintenance' | 'repair' | 'utility' | 'legal' | 'tax' | 'other' | string;
  date?: string;
  receipt_url?: string | null;
  invoice_url?: string | null;
  notes?: string | null;
}

/**
 * Query filters for leases
 */
export interface LeaseFilters {
  status?: LeaseStatus | 'all';
  propertyId?: string;
  tenantId?: string;
  ownerId?: string;
  search?: string;
}

/**
 * Query filters for settlements
 */
export interface SettlementFilters {
  period?: string;
  tenantStatus?: TenantPaymentStatus | 'all';
  ownerStatus?: OwnerPayoutStatus | 'all';
  leaseId?: string;
  search?: string;
}
