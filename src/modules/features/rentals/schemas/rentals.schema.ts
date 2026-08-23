// ==============================================================================
// PIXY RENTFLOW PRO — ZOD VALIDATION SCHEMAS
// Module: module_rentals (Real Estate Space)
// Path: src/modules/features/rentals/schemas/rentals.schema.ts
// ==============================================================================

import { z } from 'zod';

/**
 * Bank Payout Details Schema for Landlord Disbursements
 */
export const bankPayoutDetailsSchema = z.object({
  bank: z.string().min(1, 'El banco es requerido'),
  account_type: z.enum(['savings', 'checking', 'ahorros', 'corriente']).default('savings'),
  account_number: z.string().min(3, 'Número de cuenta inválido'),
  account_holder: z.string().min(2, 'Titular de cuenta requerido'),
  id_number: z.string().min(4, 'Documento de identidad requerido'),
  id_type: z.enum(['CC', 'NIT', 'CE', 'PP', 'TI', 'PAS']).optional().default('CC'),
});

/**
 * Guarantee Details Schema (Insurance, Surety Bond, Promissory Note)
 */
export const guaranteeDetailsSchema = z.object({
  company_name: z.string().optional(),
  provider: z.string().optional(),
  policy_number: z.string().optional(),
  coverage_percentage: z.number().min(0).max(100).optional().default(100),
  valid_until: z.string().optional(),
  status: z.string().optional().default('active'),
  notes: z.string().optional(),
}).passthrough();

/**
 * Deduction Item Schema for Maintenance & Repairs
 */
export const deductionItemSchema = z.object({
  id: z.string().optional().default(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `ded_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }),
  concept: z.string().min(2, 'El concepto de la deducción es requerido'),
  amount: z.number().positive('El monto de la deducción debe ser mayor a 0'),
  category: z.enum(['maintenance', 'repairs', 'repair', 'utility', 'utilities', 'legal', 'tax', 'other']).default('maintenance'),
  date: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  receipt_url: z.string().optional().nullable(),
  invoice_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  created_at: z.string().optional().default(() => new Date().toISOString()),
});

/**
 * Create Property Lease Schema
 */
export const createLeaseSchema = z.object({
  organization_id: z.string().uuid().optional(),
  property_id: z.string().uuid('Debe seleccionar una propiedad válida'),
  tenant_id: z.string().uuid('Debe seleccionar un inquilino válido'),
  owner_id: z.string().uuid('Debe seleccionar un propietario válido'),
  co_signer_id: z.string().uuid().optional().nullable(),
  monthly_rent: z.number().positive('El canon mensual de arrendamiento debe ser mayor a 0'),
  admin_fee: z.number().nonnegative('El valor de administración no puede ser negativo').default(0),
  admin_paid_by: z.enum(['agency', 'tenant']).default('agency'),
  commission_percentage: z.number().min(0).max(100).default(8.0),
  vat_on_commission: z.boolean().default(true),
  deposit_amount: z.number().nonnegative().default(0),
  payment_day: z.number().int().min(1).max(31).default(5),
  payout_day: z.number().int().min(1).max(31).default(10),
  start_date: z.string().min(1, 'La fecha de inicio es requerida'),
  end_date: z.string().min(1, 'La fecha de finalización es requerida'),
  status: z.enum(['active', 'pending', 'expired', 'defaulted', 'terminated']).default('active'),
  guarantee_type: z.enum(['direct', 'insurance', 'bond', 'deposit', 'promissory_note']).default('insurance'),
  guarantee_details: guaranteeDetailsSchema.optional().default(() => ({
    company_name: '',
    provider: '',
    policy_number: '',
    coverage_percentage: 100,
    status: 'active',
  })),
  bank_payout_details: bankPayoutDetailsSchema,
  notes: z.string().optional().nullable(),
});

/**
 * Update Property Lease Schema
 */
export const updateLeaseSchema = createLeaseSchema.partial().extend({
  id: z.string().uuid('ID de contrato inválido'),
});

/**
 * Record Tenant Payment Schema
 */
export const recordTenantPaymentSchema = z.object({
  settlement_id: z.string().uuid('ID de liquidación inválido'),
  paid_at: z.string().optional(),
  payment_proof_url: z.string().optional().nullable(),
  payment_method: z.string().default('transfer'),
  notes: z.string().optional().nullable(),
});

/**
 * Record Owner Payout Schema
 */
export const recordOwnerPayoutSchema = z.object({
  settlement_id: z.string().uuid('ID de liquidación inválido'),
  paid_at: z.string().optional(),
  statement_pdf_url: z.string().optional().nullable(),
  payment_proof_url: z.string().optional().nullable(),
  transaction_reference: z.string().optional().nullable(),
  receipt_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * Add Itemized Deduction Schema
 */
export const addDeductionSchema = z.object({
  settlement_id: z.string().uuid('ID de liquidación inválido'),
  deduction: deductionItemSchema,
});
