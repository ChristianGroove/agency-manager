// ==============================================================================
// PIXY RENTFLOW PRO — PROPERTY LEASE & SETTLEMENT DOMAIN TYPES
// Module: module_rentals (Real Estate Space)
// File: src/types/rentals.ts
// ==============================================================================

/**
 * Status of a property rental contract
 */
export type LeaseStatus = 'active' | 'pending' | 'expired' | 'defaulted' | 'terminated';

/**
 * Guarantee mechanism backing the lease
 */
export type GuaranteeType = 'direct' | 'insurance' | 'bond' | 'deposit' | 'promissory_note';

/**
 * Party responsible for paying the condominium / HOA admin fee
 */
export type AdminPaidBy = 'agency' | 'tenant';

/**
 * Monthly billing collection status from tenant
 */
export type TenantPaymentStatus = 'pending' | 'paid' | 'partial' | 'late';

/**
 * Monthly disbursement payout status to property owner / landlord
 */
export type OwnerPayoutStatus = 'pending' | 'paid' | 'held';

/**
 * Bank account details for automated / registered landlord payouts
 */
export interface BankPayoutDetails {
  bank: string;
  account_type: 'savings' | 'checking' | string;
  account_number: string;
  account_holder: string;
  id_number: string;
  id_type?: 'CC' | 'NIT' | 'CE' | 'PP' | 'TI' | 'PAS' | string;
  [key: string]: any;
}

/**
 * Additional guarantee metadata (e.g. Seguros Bolívar, Libertador policy #)
 */
export interface GuaranteeDetails {
  provider?: string;
  policy_number?: string;
  coverage_percentage?: number;
  status?: string;
  notes?: string;
  [key: string]: any;
}

/**
 * Itemized maintenance, repair, or utility deduction from monthly owner payout
 */
export interface SettlementDeduction {
  id: string;
  concept: string;
  amount: number;
  category: 'maintenance' | 'repair' | 'utility' | 'legal' | 'tax' | 'other' | string;
  date: string;
  receipt_url?: string;
  notes?: string;
}

/**
 * Core Property Rental Lease Contract Entity
 */
export interface PropertyLease {
  id: string;
  organization_id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  co_signer_id?: string | null;
  
  // Financial Parameters
  monthly_rent: number;
  admin_fee: number;
  admin_paid_by: AdminPaidBy;
  commission_percentage: number;
  vat_on_commission: boolean;
  deposit_amount: number;
  
  // Term & Billing Schedule
  payment_day: number;
  payout_day: number;
  start_date: string;
  end_date: string;
  
  // Status & Guarantees
  status: LeaseStatus;
  guarantee_type: GuaranteeType;
  guarantee_details: GuaranteeDetails;
  bank_payout_details: BankPayoutDetails;
  notes?: string | null;
  
  // Lifecycle Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  
  // Joined Relations (Optional)
  property?: {
    id: string;
    name: string;
    base_price: number;
    real_estate_details?: any;
    images?: any[];
    gallery_images?: any[];
    [key: string]: any;
  };
  tenant?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    metadata?: any;
    [key: string]: any;
  };
  owner?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    metadata?: any;
    [key: string]: any;
  };
  co_signer?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    metadata?: any;
    [key: string]: any;
  } | null;
}

/**
 * Monthly Lease Settlement Statement & Payout Entity
 */
export interface PropertyLeaseSettlement {
  id: string;
  organization_id: string;
  lease_id: string;
  period: string; // Format: "YYYY-MM"
  invoice_id?: string | null;
  
  // Financial Breakdown
  rent_amount: number;
  admin_fee_amount: number;
  gross_collected: number;
  commission_amount: number;
  vat_amount: number;
  deductions_amount: number;
  net_owner_payout: number;
  
  // Lifecycle & Status
  tenant_payment_status: TenantPaymentStatus;
  tenant_paid_at?: string | null;
  owner_payout_status: OwnerPayoutStatus;
  owner_paid_at?: string | null;
  
  // Deductions & Proofs
  deductions: SettlementDeduction[];
  statement_pdf_url?: string | null;
  payment_proof_url?: string | null;
  receipt_number?: string | null;
  notes?: string | null;
  
  // Lifecycle Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  
  // Joined Relations (Optional)
  lease?: PropertyLease;
}
