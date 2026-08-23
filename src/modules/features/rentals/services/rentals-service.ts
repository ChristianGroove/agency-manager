// ==============================================================================
// PIXY RENTFLOW PRO — DATABASE SERVICE LAYER
// Module: module_rentals (Real Estate Space)
// Path: src/modules/features/rentals/services/rentals-service.ts
// ==============================================================================

import { createClient } from '@/modules/core/database/supabase-server';
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions';
import { requireOrgRole } from '@/modules/core/iam/services/org-roles';
import { revalidatePath } from 'next/cache';
import { calculateSettlement } from './settlement-calculator';
import type {
  PropertyLease,
  PropertyLeaseSettlement,
  CreateLeaseInput,
  UpdateLeaseInput,
  RecordTenantPaymentInput,
  RecordOwnerPayoutInput,
  DeductionInput,
  SettlementDeduction,
  LeaseFilters,
  SettlementFilters,
  ActionResponse,
} from '../types/rentals.types';

function isDeployedRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  return fallback;
}

/**
 * Safe wrapper around revalidatePath that will not fail in standalone script environments
 */
function safeRevalidate(paths: string[] = ['/rentals', '/portfolio']) {
  try {
    for (const p of paths) {
      revalidatePath(p);
    }
  } catch (_) {
    // Gracefully ignore when invoked outside of active Next.js server request lifecycle
  }
}

/**
 * Validates active organization ID and IAM role
 */
async function resolveOrganizationAndRole(
  explicitOrgId?: string,
  inputOrgId?: string
): Promise<{ orgId: string | null; error?: string }> {
  const orgId = explicitOrgId || inputOrgId || await getCurrentOrganizationId();
  if (!orgId) {
    return { orgId: null, error: 'No se encontró la organización activa' };
  }

  // If executing in a live user session without explicit override, enforce member role
  if (!explicitOrgId && !inputOrgId) {
    try {
      await requireOrgRole('member');
    } catch (roleErr: any) {
      if (roleErr?.message?.includes('Unauthorized')) {
        return { orgId: null, error: 'No tienes permisos suficientes en esta organización' };
      }
    }
  }

  return { orgId };
}

/**
 * Helper to update property rental status in service_catalog
 */
async function updatePropertyRentalStatus(
  supabase: any,
  propertyId: string,
  orgId: string,
  rentalStatus: 'available' | 'rented' | 'reserved'
) {
  try {
    const { data: item, error: fetchErr } = await supabase
      .from('service_catalog')
      .select('real_estate_details, metadata')
      .eq('id', propertyId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (fetchErr || !item) {
      console.warn(`[RENTALS_SERVICE] Property ${propertyId} not found for rental_status update`);
      return;
    }

    const currentRealEstate = item.real_estate_details || {};
    const currentMetadata = item.metadata || {};

    const updatedRealEstate = {
      ...currentRealEstate,
      rental_status: rentalStatus,
    };

    const updatedMetadata = {
      ...currentMetadata,
      rental_status: rentalStatus,
      real_estate_details: updatedRealEstate,
    };

    const { error: updateErr } = await supabase
      .from('service_catalog')
      .update({
        real_estate_details: updatedRealEstate,
        metadata: updatedMetadata,
      })
      .eq('id', propertyId)
      .eq('organization_id', orgId);

    if (updateErr) {
      console.error(`[RENTALS_SERVICE] Error updating property ${propertyId} rental_status:`, updateErr);
    }
  } catch (err) {
    console.error(`[RENTALS_SERVICE] Failed to update property rental status for ${propertyId}:`, err);
  }
}

/**
 * Create a new property lease contract
 */
export async function createLease(
  input: CreateLeaseInput,
  explicitOrgId?: string
): Promise<ActionResponse<PropertyLease>> {
  try {
    const { orgId, error: authError } = await resolveOrganizationAndRole(explicitOrgId, input.organization_id);
    if (authError || !orgId) {
      return { success: false, error: authError || 'No se encontró la organización activa' };
    }

    const supabase = await createClient();

    const insertPayload = {
      organization_id: orgId,
      property_id: input.property_id,
      tenant_id: input.tenant_id,
      owner_id: input.owner_id,
      co_signer_id: input.co_signer_id || null,
      monthly_rent: input.monthly_rent,
      admin_fee: input.admin_fee ?? 0,
      admin_paid_by: input.admin_paid_by ?? 'agency',
      commission_percentage: input.commission_percentage ?? 8.0,
      vat_on_commission: input.vat_on_commission ?? true,
      deposit_amount: input.deposit_amount ?? 0,
      payment_day: input.payment_day ?? 5,
      payout_day: input.payout_day ?? 10,
      start_date: input.start_date,
      end_date: input.end_date,
      status: input.status ?? 'active',
      guarantee_type: input.guarantee_type ?? 'direct',
      guarantee_details: input.guarantee_details ?? {},
      bank_payout_details: input.bank_payout_details,
      notes: input.notes || null,
    };

    const { data, error } = await supabase
      .from('property_leases')
      .insert(insertPayload)
      .select(`
        *,
        property:service_catalog(id, name, base_price, classification, real_estate_details, images, gallery_images),
        tenant:leads!tenant_id(id, name, email, phone, metadata, company_name),
        owner:leads!owner_id(id, name, email, phone, metadata, company_name),
        co_signer:leads!co_signer_id(id, name, email, phone, metadata, company_name)
      `)
      .single();

    if (error) {
      console.error('[RENTALS_SERVICE] Error inserting lease:', error);
      return { success: false, error: getErrorMessage(error, 'No se pudo crear el contrato de arrendamiento') };
    }

    // Automatically set property status to 'rented' if lease is active
    if (insertPayload.status === 'active') {
      await updatePropertyRentalStatus(supabase, input.property_id, orgId, 'rented');
    }

    // Sync contact metadata for owner and tenant if provided
    try {
      if (input.owner_id) {
        const { data: currentOwner } = await supabase.from('leads').select('metadata').eq('id', input.owner_id).single();
        const ownerMeta = currentOwner?.metadata || {};
        const updatedOwnerMeta = {
          ...ownerMeta,
          role: ownerMeta.role || 'owner',
          ...(input.bank_payout_details?.account_number ? { bank_details: input.bank_payout_details } : {})
        };
        await supabase.from('leads').update({ metadata: updatedOwnerMeta }).eq('id', input.owner_id);
      }

      if (input.tenant_id) {
        const { data: currentTenant } = await supabase.from('leads').select('metadata').eq('id', input.tenant_id).single();
        const tenantMeta = currentTenant?.metadata || {};
        if (!tenantMeta.role || tenantMeta.role === 'other') {
          await supabase.from('leads').update({ metadata: { ...tenantMeta, role: 'tenant' } }).eq('id', input.tenant_id);
        }
      }
    } catch (syncErr) {
      console.warn('[RENTALS_SERVICE] Non-critical error syncing contact metadata:', syncErr);
    }

    safeRevalidate(['/rentals', '/portfolio', '/crm/clients']);

    return { success: true, data: data as PropertyLease };
  } catch (err) {
    console.error('[RENTALS_SERVICE] Unexpected error in createLease:', err);
    return { success: false, error: getErrorMessage(err, 'Error inesperado al crear el contrato') };
  }
}

/**
 * Update an existing property lease contract
 */
export async function updateLease(
  id: string,
  updates: Partial<CreateLeaseInput>,
  explicitOrgId?: string
): Promise<ActionResponse<PropertyLease>> {
  try {
    const { orgId, error: authError } = await resolveOrganizationAndRole(explicitOrgId, updates.organization_id);
    if (authError || !orgId) {
      return { success: false, error: authError || 'No se encontró la organización activa' };
    }

    const supabase = await createClient();

    // Fetch existing lease to compare property or status transitions
    const { data: existing, error: fetchError } = await supabase
      .from('property_leases')
      .select('property_id, status')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Contrato de arrendamiento no encontrado' };
    }

    const updatePayload: Record<string, any> = {};
    if (updates.property_id !== undefined) updatePayload.property_id = updates.property_id;
    if (updates.tenant_id !== undefined) updatePayload.tenant_id = updates.tenant_id;
    if (updates.owner_id !== undefined) updatePayload.owner_id = updates.owner_id;
    if (updates.co_signer_id !== undefined) updatePayload.co_signer_id = updates.co_signer_id;
    if (updates.monthly_rent !== undefined) updatePayload.monthly_rent = updates.monthly_rent;
    if (updates.admin_fee !== undefined) updatePayload.admin_fee = updates.admin_fee;
    if (updates.admin_paid_by !== undefined) updatePayload.admin_paid_by = updates.admin_paid_by;
    if (updates.commission_percentage !== undefined) updatePayload.commission_percentage = updates.commission_percentage;
    if (updates.vat_on_commission !== undefined) updatePayload.vat_on_commission = updates.vat_on_commission;
    if (updates.deposit_amount !== undefined) updatePayload.deposit_amount = updates.deposit_amount;
    if (updates.payment_day !== undefined) updatePayload.payment_day = updates.payment_day;
    if (updates.payout_day !== undefined) updatePayload.payout_day = updates.payout_day;
    if (updates.start_date !== undefined) updatePayload.start_date = updates.start_date;
    if (updates.end_date !== undefined) updatePayload.end_date = updates.end_date;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.guarantee_type !== undefined) updatePayload.guarantee_type = updates.guarantee_type;
    if (updates.guarantee_details !== undefined) updatePayload.guarantee_details = updates.guarantee_details;
    if (updates.bank_payout_details !== undefined) updatePayload.bank_payout_details = updates.bank_payout_details;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;

    const { data, error } = await supabase
      .from('property_leases')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select(`
        *,
        property:service_catalog(id, name, base_price, classification, real_estate_details, images, gallery_images),
        tenant:leads!tenant_id(id, name, email, phone, metadata, company_name),
        owner:leads!owner_id(id, name, email, phone, metadata, company_name),
        co_signer:leads!co_signer_id(id, name, email, phone, metadata, company_name)
      `)
      .single();

    if (error) {
      console.error('[RENTALS_SERVICE] Error updating lease:', error);
      return { success: false, error: getErrorMessage(error, 'No se pudo actualizar el contrato de arrendamiento') };
    }

    // Handle status transitions for property
    const newStatus = updates.status || existing.status;
    const targetPropertyId = updates.property_id || existing.property_id;

    if (newStatus === 'terminated' || newStatus === 'expired') {
      await updatePropertyRentalStatus(supabase, targetPropertyId, orgId, 'available');
    } else if (newStatus === 'active') {
      await updatePropertyRentalStatus(supabase, targetPropertyId, orgId, 'rented');
    }

    // If property was swapped, free old property
    if (updates.property_id && updates.property_id !== existing.property_id) {
      await updatePropertyRentalStatus(supabase, existing.property_id, orgId, 'available');
    }

    safeRevalidate(['/rentals', '/portfolio']);

    return { success: true, data: data as PropertyLease };
  } catch (err) {
    console.error('[RENTALS_SERVICE] Unexpected error in updateLease:', err);
    return { success: false, error: getErrorMessage(err, 'Error inesperado al actualizar el contrato') };
  }
}

/**
 * Terminate a lease contract and release property
 */
export async function terminateLease(
  id: string,
  notes?: string,
  explicitOrgId?: string
): Promise<ActionResponse<PropertyLease>> {
  try {
    const { orgId, error: authError } = await resolveOrganizationAndRole(explicitOrgId);
    if (authError || !orgId) {
      return { success: false, error: authError || 'No se encontró la organización activa' };
    }

    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from('property_leases')
      .select('property_id, notes')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Contrato de arrendamiento no encontrado' };
    }

    const terminationNote = notes ? `\n[Terminación ${new Date().toISOString().split('T')[0]}]: ${notes}` : '';
    const combinedNotes = (existing.notes || '') + terminationNote;

    const { data, error } = await supabase
      .from('property_leases')
      .update({
        status: 'terminated',
        end_date: new Date().toISOString().split('T')[0],
        notes: combinedNotes.trim(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select(`
        *,
        property:service_catalog(id, name, base_price, classification, real_estate_details, images, gallery_images),
        tenant:leads!tenant_id(id, name, email, phone, metadata, company_name),
        owner:leads!owner_id(id, name, email, phone, metadata, company_name),
        co_signer:leads!co_signer_id(id, name, email, phone, metadata, company_name)
      `)
      .single();

    if (error) {
      console.error('[RENTALS_SERVICE] Error terminating lease:', error);
      return { success: false, error: getErrorMessage(error, 'No se pudo terminar el contrato') };
    }

    // Set property back to 'available'
    await updatePropertyRentalStatus(supabase, existing.property_id, orgId, 'available');

    safeRevalidate(['/rentals', '/portfolio']);

    return { success: true, data: data as PropertyLease };
  } catch (err) {
    console.error('[RENTALS_SERVICE] Unexpected error in terminateLease:', err);
    return { success: false, error: getErrorMessage(err, 'Error inesperado al terminar el contrato') };
  }
}

/**
 * Fetch all leases with filters and relation joins
 */
export async function getLeases(
  filters?: LeaseFilters,
  explicitOrgId?: string
): Promise<ActionResponse<PropertyLease[]>> {
  try {
    const { orgId, error: authError } = await resolveOrganizationAndRole(explicitOrgId);
    if (authError || !orgId) {
      return { success: false, error: authError || 'No se encontró la organización activa' };
    }

    const supabase = await createClient();

    let query = supabase
      .from('property_leases')
      .select(`
        *,
        property:service_catalog(id, name, base_price, classification, real_estate_details, images, gallery_images),
        tenant:leads!tenant_id(id, name, email, phone, metadata, company_name),
        owner:leads!owner_id(id, name, email, phone, metadata, company_name),
        co_signer:leads!co_signer_id(id, name, email, phone, metadata, company_name)
      `)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    if (filters?.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }

    if (filters?.ownerId) {
      query = query.eq('owner_id', filters.ownerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[RENTALS_SERVICE] Error fetching leases:', error);
      return { success: false, error: getErrorMessage(error, 'No se pudieron obtener los contratos') };
    }

    return { success: true, data: (data || []) as PropertyLease[] };
  } catch (err) {
    console.error('[RENTALS_SERVICE] Unexpected error in getLeases:', err);
    return { success: false, error: getErrorMessage(err, 'Error inesperado al obtener los contratos') };
  }
}

/**
 * Fetch a single lease by ID with relations
 */
export async function getLeaseById(
  id: string,
  explicitOrgId?: string
): Promise<ActionResponse<PropertyLease | null>> {
  try {
    const { orgId, error: authError } = await resolveOrganizationAndRole(explicitOrgId);
    if (authError || !orgId) {
      return { success: false, error: authError || 'No se encontró la organización activa' };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('property_leases')
      .select(`
        *,
        property:service_catalog(id, name, base_price, classification, real_estate_details, images, gallery_images),
        tenant:leads!tenant_id(id, name, email, phone, metadata, company_name),
        owner:leads!owner_id(id, name, email, phone, metadata, company_name),
        co_signer:leads!co_signer_id(id, name, email, phone, metadata, company_name)
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) {
      console.error('[RENTALS_SERVICE] Error fetching lease by id:', error);
      return { success: false, error: getErrorMessage(error, 'No se pudo obtener el contrato') };
    }

    return { success: true, data: (data as PropertyLease) || null };
  } catch (err) {
    console.error('[RENTALS_SERVICE] Unexpected error in getLeaseById:', err);
    return { success: false, error: getErrorMessage(err, 'Error inesperado al obtener el contrato') };
  }
}

/**
 * Generate monthly settlement statements for all active leases for a given period (YYYY-MM)
 * Idempotent: Skips leases that already have a settlement for the specified period.
 */
export async function generateMonthlySettlements(
  period: string,
  leaseIds?: string[],
  explicitOrgId?: string
): Promise<ActionResponse<PropertyLeaseSettlement[]>> {
  try {
    const { orgId, error: authError } = await resolveOrganizationAndRole(explicitOrgId);
    if (authError || !orgId) {
      return { success: false, error: authError || 'No se encontró la organización activa' };
    }

    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return { success: false, error: 'Formato de periodo inválido. Debe ser YYYY-MM (ej. 2026-09)' };
    }

    const supabase = await createClient();

    // 1. Fetch target leases
    let leasesQuery = supabase
      .from('property_leases')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (leaseIds && leaseIds.length > 0) {
      leasesQuery = leasesQuery.in('id', leaseIds);
    }

    const { data: leases, error: leasesErr } = await leasesQuery;

    if (leasesErr) {
      console.error('[RENTALS_SERVICE] Error fetching active leases for settlement:', leasesErr);
      return { success: false, error: getErrorMessage(leasesErr, 'No se pudieron consultar los contratos activos') };
    }

    if (!leases || leases.length === 0) {
      return { success: true, data: [] };
    }

    // 2. Fetch existing settlements for this period
    const { data: existingSettlements, error: existingErr } = await supabase
      .from('property_lease_settlements')
      .select('lease_id')
      .eq('organization_id', orgId)
      .eq('period', period);

    if (existingErr) {
      console.error('[RENTALS_SERVICE] Error checking existing settlements:', existingErr);
    }

    const existingLeaseIdSet = new Set((existingSettlements || []).map((s) => s.lease_id));

    // 3. Build new settlements
    const settlementsToInsert: any[] = [];
    const formattedPeriodClean = period.replace('-', '');

    for (const lease of leases) {
      if (existingLeaseIdSet.has(lease.id)) {
        continue; // Idempotent skip
      }

      const calc = calculateSettlement({
        monthlyRent: Number(lease.monthly_rent) || 0,
        adminFee: Number(lease.admin_fee) || 0,
        adminPaidBy: lease.admin_paid_by || 'agency',
        commissionPercentage: Number(lease.commission_percentage) ?? 8.0,
        vatOnCommission: lease.vat_on_commission ?? true,
        deductions: [],
      });

      const receiptSuffix = lease.id.replace(/-/g, '').slice(0, 5).toUpperCase();
      const receiptNumber = `LIQ-${formattedPeriodClean}-${receiptSuffix}`;

      settlementsToInsert.push({
        organization_id: orgId,
        lease_id: lease.id,
        period,
        receipt_number: receiptNumber,
        rent_amount: calc.rentAmount,
        admin_fee_amount: calc.adminFeeAmount,
        gross_collected: calc.grossCollected,
        commission_amount: calc.commissionAmount,
        vat_amount: calc.vatAmount,
        deductions_amount: 0,
        net_owner_payout: calc.netOwnerPayout,
        tenant_payment_status: 'pending',
        owner_payout_status: 'pending',
        deductions: [],
      });
    }

    if (settlementsToInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from('property_lease_settlements')
        .insert(settlementsToInsert);

      if (insertErr) {
        console.error('[RENTALS_SERVICE] Error inserting settlements:', insertErr);
        return { success: false, error: getErrorMessage(insertErr, 'Error al generar liquidaciones') };
      }
    }

    safeRevalidate(['/rentals']);

    // 4. Return all settlements for this period
    return await getSettlements({ period }, orgId);
  } catch (err) {
    console.error('[RENTALS_SERVICE] Unexpected error in generateMonthlySettlements:', err);
    return { success: false, error: getErrorMessage(err, 'Error inesperado al generar liquidaciones mensuales') };
  }
}

/**
 * Record payment received from tenant
 */
export async function recordTenantPayment(
  input: RecordTenantPaymentInput,
  explicitOrgId?: string
): Promise<ActionResponse<PropertyLeaseSettlement>> {
  try {
    const { orgId, error: authError } = await resolveOrganizationAndRole(explicitOrgId);
    if (authError || !orgId) {
      return { success: false, error: authError || 'No se encontró la organización activa' };
    }

    const supabase = await createClient();

    const updatePayload: Record<string, any> = {
      tenant_payment_status: 'paid',
      tenant_paid_at: input.paid_at || new Date().toISOString(),
    };

    if (input.payment_proof_url) {
      updatePayload.payment_proof_url = input.payment_proof_url;
    }

    if (input.notes) {
      updatePayload.notes = input.notes;
    }

    const { data, error } = await supabase
      .from('property_lease_settlements')
      .update(updatePayload)
      .eq('id', input.settlement_id)
      .eq('organization_id', orgId)
      .select(`
        *,
        lease:property_leases(
          *,
          property:service_catalog(id, name, base_price, classification, real_estate_details, images, gallery_images),
          tenant:leads!tenant_id(id, name, email, phone, metadata, company_name),
          owner:leads!owner_id(id, name, email, phone, metadata, company_name)
        )
      `)
      .single();

    if (error) {
      console.error('[RENTALS_SERVICE] Error recording tenant payment:', error);
      return { success: false, error: getErrorMessage(error, 'No se pudo registrar el pago del inquilino') };
    }

    safeRevalidate(['/rentals']);

    return { success: true, data: data as PropertyLeaseSettlement };
  } catch (err) {
    console.error('[RENTALS_SERVICE] Unexpected error in recordTenantPayment:', err);
    return { success: false, error: getErrorMessage(err, 'Error inesperado al registrar el pago') };
  }
}

/**
 * Record payout disbursed to property owner / landlord
 */
export async function recordOwnerPayout(
  input: RecordOwnerPayoutInput,
  explicitOrgId?: string
): Promise<ActionResponse<PropertyLeaseSettlement>> {
  try {
    const { orgId, error: authError } = await resolveOrganizationAndRole(explicitOrgId);
    if (authError || !orgId) {
      return { success: false, error: authError || 'No se encontró la organización activa' };
    }

    const supabase = await createClient();

    const updatePayload: Record<string, any> = {
      owner_payout_status: 'paid',
      owner_paid_at: input.paid_at || new Date().toISOString(),
    };

    if (input.statement_pdf_url) updatePayload.statement_pdf_url = input.statement_pdf_url;
    if (input.payment_proof_url) updatePayload.payment_proof_url = input.payment_proof_url;
    if (input.receipt_number) updatePayload.receipt_number = input.receipt_number;
    if (input.notes) updatePayload.notes = input.notes;

    const { data, error } = await supabase
      .from('property_lease_settlements')
      .update(updatePayload)
      .eq('id', input.settlement_id)
      .eq('organization_id', orgId)
      .select(`
        *,
        lease:property_leases(
          *,
          property:service_catalog(id, name, base_price, classification, real_estate_details, images, gallery_images),
          tenant:leads!tenant_id(id, name, email, phone, metadata, company_name),
          owner:leads!owner_id(id, name, email, phone, metadata, company_name)
        )
      `)
      .single();

    if (error) {
      console.error('[RENTALS_SERVICE] Error recording owner payout:', error);
      return { success: false, error: getErrorMessage(error, 'No se pudo registrar la transferencia al propietario') };
    }

    safeRevalidate(['/rentals']);

    return { success: true, data: data as PropertyLeaseSettlement };
  } catch (err) {
    console.error('[RENTALS_SERVICE] Unexpected error in recordOwnerPayout:', err);
    return { success: false, error: getErrorMessage(err, 'Error inesperado al registrar la liquidación') };
  }
}

/**
 * Add an itemized maintenance/repair deduction to a monthly settlement and dynamically recalculate net payout
 */
export async function addDeduction(
  settlementId: string,
  deduction: DeductionInput,
  explicitOrgId?: string
): Promise<ActionResponse<PropertyLeaseSettlement>> {
  try {
    const { orgId, error: authError } = await resolveOrganizationAndRole(explicitOrgId);
    if (authError || !orgId) {
      return { success: false, error: authError || 'No se encontró la organización activa' };
    }

    const supabase = await createClient();

    // 1. Fetch current settlement and linked lease
    const { data: settlement, error: fetchErr } = await supabase
      .from('property_lease_settlements')
      .select(`
        *,
        lease:property_leases(*)
      `)
      .eq('id', settlementId)
      .eq('organization_id', orgId)
      .single();

    if (fetchErr || !settlement) {
      return { success: false, error: 'Liquidación no encontrada' };
    }

    // 2. Prepare new deduction item
    const deductionItem: SettlementDeduction = {
      id: deduction.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ded_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
      concept: deduction.concept,
      amount: Math.max(0, Number(deduction.amount) || 0),
      category: deduction.category || 'maintenance',
      date: deduction.date || new Date().toISOString().split('T')[0],
      receipt_url: deduction.receipt_url || deduction.invoice_url || undefined,
      notes: deduction.notes || undefined,
    };

    const currentDeductions: SettlementDeduction[] = Array.isArray(settlement.deductions)
      ? settlement.deductions
      : [];

    const updatedDeductions = [...currentDeductions, deductionItem];

    // 3. Recalculate settlement amounts
    const leaseData = settlement.lease;
    const calc = calculateSettlement({
      monthlyRent: Number(leaseData?.monthly_rent ?? settlement.rent_amount) || 0,
      adminFee: Number(leaseData?.admin_fee ?? settlement.admin_fee_amount) || 0,
      adminPaidBy: leaseData?.admin_paid_by ?? 'agency',
      commissionPercentage: Number(leaseData?.commission_percentage) ?? 8.0,
      vatOnCommission: leaseData?.vat_on_commission ?? true,
      deductions: updatedDeductions,
    });

    // 4. Update settlement in database
    const { data, error } = await supabase
      .from('property_lease_settlements')
      .update({
        deductions: updatedDeductions,
        deductions_amount: calc.deductionsAmount,
        net_owner_payout: calc.netOwnerPayout,
      })
      .eq('id', settlementId)
      .eq('organization_id', orgId)
      .select(`
        *,
        lease:property_leases(
          *,
          property:service_catalog(id, name, base_price, classification, real_estate_details, images, gallery_images),
          tenant:leads!tenant_id(id, name, email, phone, metadata, company_name),
          owner:leads!owner_id(id, name, email, phone, metadata, company_name)
        )
      `)
      .single();

    if (error) {
      console.error('[RENTALS_SERVICE] Error adding deduction to settlement:', error);
      return { success: false, error: getErrorMessage(error, 'No se pudo agregar la deducción') };
    }

    safeRevalidate(['/rentals']);

    return { success: true, data: data as PropertyLeaseSettlement };
  } catch (err) {
    console.error('[RENTALS_SERVICE] Unexpected error in addDeduction:', err);
    return { success: false, error: getErrorMessage(err, 'Error inesperado al agregar la deducción') };
  }
}

/**
 * Fetch monthly settlements with filters and relation joins
 */
export async function getSettlements(
  filters?: SettlementFilters,
  explicitOrgId?: string
): Promise<ActionResponse<PropertyLeaseSettlement[]>> {
  try {
    const { orgId, error: authError } = await resolveOrganizationAndRole(explicitOrgId);
    if (authError || !orgId) {
      return { success: false, error: authError || 'No se encontró la organización activa' };
    }

    const supabase = await createClient();

    let query = supabase
      .from('property_lease_settlements')
      .select(`
        *,
        lease:property_leases(
          *,
          property:service_catalog(id, name, base_price, classification, real_estate_details, images, gallery_images),
          tenant:leads!tenant_id(id, name, email, phone, metadata, company_name),
          owner:leads!owner_id(id, name, email, phone, metadata, company_name)
        )
      `)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.period) {
      query = query.eq('period', filters.period);
    }

    if (filters?.tenantStatus && filters.tenantStatus !== 'all') {
      query = query.eq('tenant_payment_status', filters.tenantStatus);
    }

    if (filters?.ownerStatus && filters.ownerStatus !== 'all') {
      query = query.eq('owner_payout_status', filters.ownerStatus);
    }

    if (filters?.leaseId) {
      query = query.eq('lease_id', filters.leaseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[RENTALS_SERVICE] Error fetching settlements:', error);
      return { success: false, error: getErrorMessage(error, 'No se pudieron obtener las liquidaciones') };
    }

    return { success: true, data: (data || []) as PropertyLeaseSettlement[] };
  } catch (err) {
    console.error('[RENTALS_SERVICE] Unexpected error in getSettlements:', err);
    return { success: false, error: getErrorMessage(err, 'Error inesperado al obtener las liquidaciones') };
  }
}

// ==============================================================================
// SERVER ACTION ALIASES FOR DIRECT SERVICE LAYER INTEGRATION
// ==============================================================================
export {
  createLease as createLeaseAction,
  updateLease as updateLeaseAction,
  terminateLease as terminateLeaseAction,
  getLeases as getLeasesAction,
  getLeaseById as getLeaseByIdAction,
  generateMonthlySettlements as generateMonthlySettlementsAction,
  recordTenantPayment as recordTenantPaymentAction,
  recordOwnerPayout as recordOwnerPayoutAction,
  addDeduction as addDeductionAction,
  getSettlements as getSettlementsAction,
};

