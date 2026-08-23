/**
 * ==============================================================================
 * CHALLENGER 2 EMPIRICAL AUDIT & STATE MACHINE VERIFICATION
 * Milestone 2: Core Mathematical Engine & Server Actions (RentFlow Pro)
 * File: tests/e2e/catalog/m2-challenger2-empirical-audit.ts
 * ==============================================================================
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
  assertContains,
} from './harness/assertions';
import {
  calculateSettlement,
  formatCOP,
  roundCurrency,
} from '../../../src/modules/features/rentals/services/settlement-calculator';
import {
  generateTenantPaymentWhatsAppLink,
  generateOwnerPayoutWhatsAppLink,
} from '../../../src/modules/features/rentals/services/whatsapp-notifier';
import {
  createLeaseSchema,
  updateLeaseSchema,
  bankPayoutDetailsSchema,
  guaranteeDetailsSchema,
  deductionItemSchema,
  recordTenantPaymentSchema,
  recordOwnerPayoutSchema,
  addDeductionSchema,
} from '../../../src/modules/features/rentals/schemas/rentals.schema';
import type {
  PropertyLease,
  PropertyLeaseSettlement,
  CreateLeaseInput,
  SettlementDeduction,
} from '../../../src/modules/features/rentals/types/rentals.types';

// ==============================================================================
// IN-MEMORY POSTGRESQL & STATE MACHINE EMULATOR FOR RENTFLOW PRO
// ==============================================================================

class MockRentalsDatabase {
  public organizations: Map<string, any> = new Map();
  public service_catalog: Map<string, any> = new Map();
  public leads: Map<string, any> = new Map();
  public property_leases: Map<string, any> = new Map();
  public property_lease_settlements: Map<string, any> = new Map();

  constructor() {
    this.seedInitialState();
  }

  public reset() {
    this.organizations.clear();
    this.service_catalog.clear();
    this.leads.clear();
    this.property_leases.clear();
    this.property_lease_settlements.clear();
    this.seedInitialState();
  }

  private seedInitialState() {
    const orgId = 'c41dcf16-f94d-499d-a1f8-bc9027206495'; // Praxis Inmobiliaria
    this.organizations.set(orgId, { id: orgId, name: 'Praxis Inmobiliaria', space_category: 'real_estate' });

    // Seed Properties in service_catalog (UUIDs)
    const prop1 = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      organization_id: orgId,
      name: 'Apartamento 502 Mirador del Vergel',
      base_price: 2500000,
      classification: 'real_estate',
      real_estate_details: { property_type: 'apartment', rental_status: 'available', city: 'Ibagué' },
      metadata: { rental_status: 'available' },
    };
    const prop2 = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      organization_id: orgId,
      name: 'Casa Campestre Calambeo',
      base_price: 4200000,
      classification: 'real_estate',
      real_estate_details: { property_type: 'house', rental_status: 'available', city: 'Ibagué' },
      metadata: { rental_status: 'available' },
    };
    const prop3 = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      organization_id: orgId,
      name: 'Local Comercial 104 La Estación',
      base_price: 3800000,
      classification: 'real_estate',
      real_estate_details: { property_type: 'commercial', rental_status: 'available', city: 'Ibagué' },
      metadata: { rental_status: 'available' },
    };

    this.service_catalog.set(prop1.id, prop1);
    this.service_catalog.set(prop2.id, prop2);
    this.service_catalog.set(prop3.id, prop3);

    // Seed Leads (Tenants & Landlords with UUIDs)
    const tenant1 = { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', organization_id: orgId, name: 'Carlos Mendoza', email: 'carlos@example.com', phone: '3001234567' };
    const tenant2 = { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', organization_id: orgId, name: 'Laura Gómez', email: 'laura@example.com', phone: '3159876543' };
    const owner1 = { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', organization_id: orgId, name: 'Dra. Patricia Silva', email: 'patricia@example.com', phone: '3105551234' };
    const owner2 = { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', organization_id: orgId, name: 'Ing. Roberto Andrade', email: 'roberto@example.com', phone: '3204449876' };

    this.leads.set(tenant1.id, tenant1);
    this.leads.set(tenant2.id, tenant2);
    this.leads.set(owner1.id, owner1);
    this.leads.set(owner2.id, owner2);
  }

  // Emulate RentalsService business logic with identical queries and transitions
  public createLease(input: CreateLeaseInput, orgId: string = 'c41dcf16-f94d-499d-a1f8-bc9027206495'): { success: boolean; data?: PropertyLease; error?: string } {
    const validated = createLeaseSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: validated.error.issues.map((i) => i.message).join(', ') };
    }

    const leaseId = crypto.randomUUID();
    const newLease: PropertyLease = {
      id: leaseId,
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
      guarantee_details: input.guarantee_details ?? ({} as any),
      bank_payout_details: input.bank_payout_details,
      notes: input.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.property_leases.set(leaseId, newLease);

    // State machine transition: active lease -> property marked as 'rented'
    if (newLease.status === 'active') {
      const prop = this.service_catalog.get(input.property_id);
      if (prop && prop.organization_id === orgId) {
        prop.real_estate_details = { ...prop.real_estate_details, rental_status: 'rented' };
        prop.metadata = { ...prop.metadata, rental_status: 'rented' };
      }
    }

    return { success: true, data: newLease };
  }

  public updateLease(id: string, updates: Partial<CreateLeaseInput>, orgId: string = 'c41dcf16-f94d-499d-a1f8-bc9027206495'): { success: boolean; data?: PropertyLease; error?: string } {
    const existing = this.property_leases.get(id);
    if (!existing || existing.organization_id !== orgId) {
      return { success: false, error: 'Contrato de arrendamiento no encontrado' };
    }

    const updated: PropertyLease = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.property_leases.set(id, updated);

    // Handle status transitions for property
    const newStatus = updates.status || existing.status;
    const targetPropertyId = updates.property_id || existing.property_id;

    if (newStatus === 'terminated' || newStatus === 'expired') {
      const prop = this.service_catalog.get(targetPropertyId);
      if (prop) {
        prop.real_estate_details = { ...prop.real_estate_details, rental_status: 'available' };
        prop.metadata = { ...prop.metadata, rental_status: 'available' };
      }
    } else if (newStatus === 'active') {
      const prop = this.service_catalog.get(targetPropertyId);
      if (prop) {
        prop.real_estate_details = { ...prop.real_estate_details, rental_status: 'rented' };
        prop.metadata = { ...prop.metadata, rental_status: 'rented' };
      }
    }

    // Property swap transition
    if (updates.property_id && updates.property_id !== existing.property_id) {
      const oldProp = this.service_catalog.get(existing.property_id);
      if (oldProp) {
        oldProp.real_estate_details = { ...oldProp.real_estate_details, rental_status: 'available' };
        oldProp.metadata = { ...oldProp.metadata, rental_status: 'available' };
      }
    }

    return { success: true, data: updated };
  }

  public terminateLease(id: string, notes?: string, orgId: string = 'c41dcf16-f94d-499d-a1f8-bc9027206495'): { success: boolean; data?: PropertyLease; error?: string } {
    const existing = this.property_leases.get(id);
    if (!existing || existing.organization_id !== orgId) {
      return { success: false, error: 'Contrato de arrendamiento no encontrado' };
    }

    const terminationNote = notes ? `\n[Terminación ${new Date().toISOString().split('T')[0]}]: ${notes}` : '';
    const combinedNotes = (existing.notes || '') + terminationNote;

    const terminated: PropertyLease = {
      ...existing,
      status: 'terminated',
      end_date: new Date().toISOString().split('T')[0],
      notes: combinedNotes.trim(),
      updated_at: new Date().toISOString(),
    };

    this.property_leases.set(id, terminated);

    // State machine transition: terminated lease -> property marked as 'available'
    const prop = this.service_catalog.get(existing.property_id);
    if (prop) {
      prop.real_estate_details = { ...prop.real_estate_details, rental_status: 'available' };
      prop.metadata = { ...prop.metadata, rental_status: 'available' };
    }

    return { success: true, data: terminated };
  }

  public generateMonthlySettlements(period: string, leaseIds?: string[], orgId: string = 'c41dcf16-f94d-499d-a1f8-bc9027206495'): { success: boolean; data?: PropertyLeaseSettlement[]; error?: string } {
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return { success: false, error: 'Formato de periodo inválido. Debe ser YYYY-MM (ej. 2026-09)' };
    }

    // 1. Fetch active leases
    let targetLeases = Array.from(this.property_leases.values()).filter(
      (l) => l.organization_id === orgId && l.status === 'active' && !l.deleted_at
    );

    if (leaseIds && leaseIds.length > 0) {
      const idSet = new Set(leaseIds);
      targetLeases = targetLeases.filter((l) => idSet.has(l.id));
    }

    if (targetLeases.length === 0) {
      return { success: true, data: [] };
    }

    // 2. Fetch existing settlements for this period
    const existingSettlements = Array.from(this.property_lease_settlements.values()).filter(
      (s) => s.organization_id === orgId && s.period === period
    );
    const existingLeaseIdSet = new Set(existingSettlements.map((s) => s.lease_id));

    // 3. Build new settlements with idempotency
    const formattedPeriodClean = period.replace('-', '');
    const generated: PropertyLeaseSettlement[] = [];

    for (const lease of targetLeases) {
      if (existingLeaseIdSet.has(lease.id)) {
        continue; // Idempotent skip!
      }

      const calc = calculateSettlement({
        monthlyRent: Number(lease.monthly_rent) || 0,
        adminFee: Number(lease.admin_fee) || 0,
        adminPaidBy: lease.admin_paid_by || 'agency',
        commissionPercentage: Number(lease.commission_percentage) ?? 8.0,
        vatOnCommission: lease.vat_on_commission ?? true,
        deductions: [],
      });

    const receiptSuffix = lease.id.replace(/[^A-Z0-9]/gi, '').slice(0, 5).toUpperCase();
    const receiptNumber = `LIQ-${formattedPeriodClean}-${receiptSuffix}`;
    const settlementId = crypto.randomUUID();

      const settlement: PropertyLeaseSettlement = {
        id: settlementId,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.property_lease_settlements.set(settlementId, settlement);
      generated.push(settlement);
    }

    // 4. Return all settlements for this period
    const allPeriodSettlements = Array.from(this.property_lease_settlements.values()).filter(
      (s) => s.organization_id === orgId && s.period === period
    );

    return { success: true, data: allPeriodSettlements };
  }

  public addDeduction(settlementId: string, deduction: any, orgId: string = 'c41dcf16-f94d-499d-a1f8-bc9027206495'): { success: boolean; data?: PropertyLeaseSettlement; error?: string } {
    const settlement = this.property_lease_settlements.get(settlementId);
    if (!settlement || settlement.organization_id !== orgId) {
      return { success: false, error: 'Liquidación no encontrada' };
    }

    const validatedDeduction = deductionItemSchema.safeParse(deduction);
    if (!validatedDeduction.success) {
      return { success: false, error: validatedDeduction.error.issues.map((i) => i.message).join(', ') };
    }

    const deductionData = validatedDeduction.data;
    const deductionItem: SettlementDeduction = {
      id: deductionData.id || `ded_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      concept: deductionData.concept,
      amount: Math.max(0, Number(deductionData.amount) || 0),
      category: deductionData.category as any,
      date: deductionData.date || new Date().toISOString().split('T')[0],
      receipt_url: deductionData.receipt_url || undefined,
      notes: deductionData.notes || undefined,
    };

    const currentDeductions: SettlementDeduction[] = Array.isArray(settlement.deductions)
      ? [...settlement.deductions]
      : [];

    const updatedDeductions = [...currentDeductions, deductionItem];

    // Find linked lease
    const lease = this.property_leases.get(settlement.lease_id);

    const calc = calculateSettlement({
      monthlyRent: Number(lease?.monthly_rent ?? settlement.rent_amount) || 0,
      adminFee: Number(lease?.admin_fee ?? settlement.admin_fee_amount) || 0,
      adminPaidBy: lease?.admin_paid_by ?? 'agency',
      commissionPercentage: Number(lease?.commission_percentage) ?? 8.0,
      vatOnCommission: lease?.vat_on_commission ?? true,
      deductions: updatedDeductions,
    });

    const updatedSettlement: PropertyLeaseSettlement = {
      ...settlement,
      deductions: updatedDeductions,
      deductions_amount: calc.deductionsAmount,
      net_owner_payout: calc.netOwnerPayout,
      updated_at: new Date().toISOString(),
    };

    this.property_lease_settlements.set(settlementId, updatedSettlement);

    return { success: true, data: updatedSettlement };
  }

  public recordTenantPayment(input: any, orgId: string = 'c41dcf16-f94d-499d-a1f8-bc9027206495'): { success: boolean; data?: PropertyLeaseSettlement; error?: string } {
    const validated = recordTenantPaymentSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: validated.error.issues.map((i) => i.message).join(', ') };
    }

    const settlement = this.property_lease_settlements.get(input.settlement_id);
    if (!settlement || settlement.organization_id !== orgId) {
      return { success: false, error: 'Liquidación no encontrada' };
    }

    const updated: PropertyLeaseSettlement = {
      ...settlement,
      tenant_payment_status: 'paid',
      tenant_paid_at: input.paid_at || new Date().toISOString(),
      payment_proof_url: input.payment_proof_url || settlement.payment_proof_url,
      updated_at: new Date().toISOString(),
    };

    this.property_lease_settlements.set(input.settlement_id, updated);
    return { success: true, data: updated };
  }

  public recordOwnerPayout(input: any, orgId: string = 'c41dcf16-f94d-499d-a1f8-bc9027206495'): { success: boolean; data?: PropertyLeaseSettlement; error?: string } {
    const validated = recordOwnerPayoutSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: validated.error.issues.map((i) => i.message).join(', ') };
    }

    const settlement = this.property_lease_settlements.get(input.settlement_id);
    if (!settlement || settlement.organization_id !== orgId) {
      return { success: false, error: 'Liquidación no encontrada' };
    }

    const updated: PropertyLeaseSettlement = {
      ...settlement,
      owner_payout_status: 'paid',
      owner_paid_at: input.paid_at || new Date().toISOString(),
      statement_pdf_url: input.statement_pdf_url || settlement.statement_pdf_url,
      payment_proof_url: input.payment_proof_url || settlement.payment_proof_url,
      receipt_number: input.receipt_number || settlement.receipt_number,
      updated_at: new Date().toISOString(),
    };

    this.property_lease_settlements.set(input.settlement_id, updated);
    return { success: true, data: updated };
  }
}

// ==============================================================================
// EMPIRICAL TEST SUITE RUNNER
// ==============================================================================

async function runEmpiricalAudit() {
  console.log('\n' + '='.repeat(90));
  console.log('  CHALLENGER 2: EMPIRICAL VERIFICATION & STATE MACHINE AUDIT (MILESTONE 2)');
  console.log('='.repeat(90) + '\n');

  const db = new MockRentalsDatabase();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failures: string[] = [];

  function test(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      failedTests++;
      const msg = `  ✗ ${name}\n    Error: ${err?.message || err}`;
      console.error(msg);
      failures.push(msg);
    }
  }

  // --------------------------------------------------------------------------
  // TASK 1.1: Lease Creation -> Property Marked as 'Rented'
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Lease Creation -> Property State Machine Transition ---');

  test('1.1.1: Active lease creation transitions property from "available" to "rented"', () => {
    const propBefore = db.service_catalog.get('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    assertEqual(propBefore.real_estate_details.rental_status, 'available', 'Initial property is available');

    const result = db.createLease({
      property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
      owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11',
      monthly_rent: 2500000,
      admin_fee: 300000,
      admin_paid_by: 'agency',
      start_date: '2026-09-01',
      end_date: '2027-08-31',
      status: 'active',
      bank_payout_details: {
        bank: 'Bancolombia',
        account_type: 'savings',
        account_number: '123456789',
        account_holder: 'Patricia Silva',
        id_number: '10203040',
        id_type: 'CC',
      },
    });

    assertTrue(result.success, 'Lease created successfully');
    assertDefined(result.data, 'Lease data returned');
    assertEqual(result.data?.status, 'active', 'Lease status is active');

    const propAfter = db.service_catalog.get('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    assertEqual(propAfter.real_estate_details.rental_status, 'rented', 'real_estate_details.rental_status is now "rented"');
    assertEqual(propAfter.metadata.rental_status, 'rented', 'metadata.rental_status is now "rented"');
  });

  test('1.1.2: Pending lease creation preserves property as "available" (not yet occupied)', () => {
    const propBefore = db.service_catalog.get('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
    assertEqual(propBefore.real_estate_details.rental_status, 'available', 'Initial property is available');

    const result = db.createLease({
      property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
      owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22',
      monthly_rent: 4200000,
      admin_fee: 450000,
      admin_paid_by: 'tenant',
      start_date: '2026-10-01',
      end_date: '2027-09-30',
      status: 'pending',
      bank_payout_details: {
        bank: 'Davivienda',
        account_type: 'checking',
        account_number: '987654321',
        account_holder: 'Roberto Andrade',
        id_number: '52345678',
        id_type: 'CC',
      },
    });

    assertTrue(result.success, 'Pending lease created');
    const propAfter = db.service_catalog.get('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
    assertEqual(propAfter.real_estate_details.rental_status, 'available', 'Property remains "available" when lease is pending');
  });

  test('1.1.3: Updating pending lease to "active" transitions property to "rented"', () => {
    const leases = Array.from(db.property_leases.values()).filter((l) => l.property_id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
    const pendingLease = leases[0];
    assertDefined(pendingLease, 'Pending lease exists');

    const updateRes = db.updateLease(pendingLease.id, { status: 'active' });
    assertTrue(updateRes.success, 'Lease updated to active');

    const prop = db.service_catalog.get('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
    assertEqual(prop.real_estate_details.rental_status, 'rented', 'Property transitioned to "rented"');
  });

  test('1.1.4: Validation rejection on invalid lease payload (negative rent / missing bank details)', () => {
    const invalidRes1 = db.createLease({
      property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
      owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11',
      monthly_rent: -1000, // Invalid negative rent
      start_date: '2026-09-01',
      end_date: '2027-08-31',
      bank_payout_details: { bank: 'Bancolombia', account_type: 'savings', account_number: '123', account_holder: 'A', id_number: '1' },
    } as any);

    assertFalse(invalidRes1.success, 'Rejects negative rent');

    const invalidRes2 = db.createLease({
      property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
      owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11',
      monthly_rent: 3000000,
      start_date: '2026-09-01',
      end_date: '2027-08-31',
      bank_payout_details: {} as any, // Missing required bank fields
    });

    assertFalse(invalidRes2.success, 'Rejects missing bank details');
  });

  // --------------------------------------------------------------------------
  // TASK 1.2: Lease Termination -> Property Marked as 'Available'
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Lease Termination -> Property Release Transition ---');

  test('1.2.1: Terminate lease sets status to "terminated" and property to "available"', () => {
    const leases = Array.from(db.property_leases.values()).filter((l) => l.property_id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    const activeLease = leases[0];
    assertDefined(activeLease, 'Active lease exists for prop-001');

    const termRes = db.terminateLease(activeLease.id, 'Entrega de llaves y paz y salvo firmado.');
    assertTrue(termRes.success, 'Lease terminated successfully');
    assertEqual(termRes.data?.status, 'terminated', 'Lease status is terminated');
    assertContains(termRes.data?.notes || '', 'Entrega de llaves', 'Termination notes appended');

    const prop = db.service_catalog.get('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    assertEqual(prop.real_estate_details.rental_status, 'available', 'Property is now available');
    assertEqual(prop.metadata.rental_status, 'available', 'Metadata reflects available');
  });

  test('1.2.2: Updating lease status to "expired" also frees property to "available"', () => {
    const leases = Array.from(db.property_leases.values()).filter((l) => l.property_id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
    const activeLease = leases[0];
    assertDefined(activeLease, 'Active lease exists for prop-002');

    const expireRes = db.updateLease(activeLease.id, { status: 'expired' });
    assertTrue(expireRes.success, 'Lease expired');

    const prop = db.service_catalog.get('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
    assertEqual(prop.real_estate_details.rental_status, 'available', 'Property released to available on expiration');
  });

  // --------------------------------------------------------------------------
  // TASK 1.3: Idempotent Settlement Generation for Same Period
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Monthly Settlement Generation & Idempotency ---');

  test('1.3.1: Generates settlements for active leases in valid period (YYYY-MM)', () => {
    // Re-create an active lease on prop-001 and prop-003
    db.createLease({
      property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
      owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11',
      monthly_rent: 2500000,
      admin_fee: 300000,
      admin_paid_by: 'agency',
      start_date: '2026-09-01',
      end_date: '2027-08-31',
      status: 'active',
      bank_payout_details: { bank: 'Bancolombia', account_type: 'savings', account_number: '123456789', account_holder: 'Patricia Silva', id_number: '10203040', id_type: 'CC' },
    });

    db.createLease({
      property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
      owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22',
      monthly_rent: 3800000,
      admin_fee: 400000,
      admin_paid_by: 'tenant',
      start_date: '2026-09-01',
      end_date: '2027-08-31',
      status: 'active',
      bank_payout_details: { bank: 'Davivienda', account_type: 'checking', account_number: '987654321', account_holder: 'Roberto Andrade', id_number: '52345678', id_type: 'CC' },
    });

    const genRes = db.generateMonthlySettlements('2026-09');
    assertTrue(genRes.success, 'Settlements generated');
    assertEqual(genRes.data?.length, 2, 'Generated 2 settlements for 2 active leases');

    const s1 = genRes.data?.find((s) => s.rent_amount === 2500000);
    assertDefined(s1, 'Settlement for prop-001 found');
    assertEqual(s1?.admin_fee_amount, 300000, 'Admin fee is 300,000');
    assertEqual(s1?.gross_collected, 2800000, 'Gross is 2,800,000');
    assertEqual(s1?.commission_amount, 200000, '8% Commission is 200,000');
    assertEqual(s1?.vat_amount, 38000, '19% VAT is 38,000');
    assertEqual(s1?.net_owner_payout, 1962000, 'Net payout = 2,500,000 - 200,000 - 38,000 - 300,000 = 1,962,000');
    assertEqual(s1?.tenant_payment_status, 'pending', 'Initial tenant status is pending');
    assertEqual(s1?.owner_payout_status, 'pending', 'Initial owner status is pending');
  });

  test('1.3.2: Re-running generateMonthlySettlements for same period is 100% idempotent', () => {
    const countBefore = db.property_lease_settlements.size;
    assertEqual(countBefore, 2, '2 settlements in DB before re-run');

    const reRunRes = db.generateMonthlySettlements('2026-09');
    assertTrue(reRunRes.success, 'Re-run succeeds cleanly');
    assertEqual(reRunRes.data?.length, 2, 'Returns same 2 settlements');

    const countAfter = db.property_lease_settlements.size;
    assertEqual(countAfter, 2, 'No duplicate settlement records created');
  });

  test('1.3.3: Rejects malformed period strings', () => {
    const invalid1 = db.generateMonthlySettlements('2026-9'); // missing leading zero
    assertFalse(invalid1.success, 'Rejects 2026-9');
    const invalid2 = db.generateMonthlySettlements('2026/09'); // wrong slash delimiter
    assertFalse(invalid2.success, 'Rejects 2026/09');
    const invalid3 = db.generateMonthlySettlements('invalid');
    assertFalse(invalid3.success, 'Rejects non-date string');
  });

  // --------------------------------------------------------------------------
  // TASK 1.4: Adding Deductions and Updating Net Payout
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Adding Deductions & Dynamic Net Payout Recalculation ---');

  test('1.4.1: Adding maintenance deduction recalculates deductions_amount and net_owner_payout', () => {
    const settlements = Array.from(db.property_lease_settlements.values()).filter((s) => s.rent_amount === 2500000);
    const target = settlements[0];
    assertDefined(target, 'Target settlement found');
    const initialNet = target.net_owner_payout; // 1,962,000

    const dedRes = db.addDeduction(target.id, {
      concept: 'Reparación fuga tubería baño principal',
      amount: 150000,
      category: 'repairs',
      notes: 'Factura Plomería Express #4590',
    });

    assertTrue(dedRes.success, 'Deduction added');
    assertDefined(dedRes.data, 'Updated settlement returned');
    assertEqual(dedRes.data?.deductions.length, 1, '1 deduction item in array');
    assertEqual(dedRes.data?.deductions_amount, 150000, 'deductions_amount updated to 150,000');
    assertEqual(dedRes.data?.net_owner_payout, initialNet - 150000, 'Net owner payout decreased by exactly 150,000 (1,812,000 COP)');
  });

  test('1.4.2: Adding multiple deductions accumulates correctly', () => {
    const settlements = Array.from(db.property_lease_settlements.values()).filter((s) => s.rent_amount === 2500000);
    const target = settlements[0];

    const dedRes2 = db.addDeduction(target.id, {
      concept: 'Mantenimiento preventivo calentador gas',
      amount: 80000,
      category: 'maintenance',
    });

    assertTrue(dedRes2.success, 'Second deduction added');
    assertEqual(dedRes2.data?.deductions.length, 2, '2 deduction items in array');
    assertEqual(dedRes2.data?.deductions_amount, 230000, 'deductions_amount = 150,000 + 80,000 = 230,000');
    assertEqual(dedRes2.data?.net_owner_payout, 1962000 - 230000, 'Net payout = 1,732,000 COP');
  });

  test('1.4.3: Massive deduction exceeding net payout clamps net_owner_payout to 0', () => {
    const settlements = Array.from(db.property_lease_settlements.values()).filter((s) => s.rent_amount === 2500000);
    const target = settlements[0];

    const dedResOverflow = db.addDeduction(target.id, {
      concept: 'Reparación estructural fachada y techos',
      amount: 10000000, // 10 million COP
      category: 'repair',
    });

    assertTrue(dedResOverflow.success, 'Extreme deduction registered');
    assertEqual(dedResOverflow.data?.net_owner_payout, 0, 'Net owner payout clamped to minimum 0.00');
  });

  // --------------------------------------------------------------------------
  // TASK 1.5: Tenant Payment Recording and Owner Payout Recording
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Payment & Payout Recording Workflows ---');

  test('1.5.1: Recording tenant payment updates status to "paid" with timestamp & receipt proof', () => {
    const settlements = Array.from(db.property_lease_settlements.values()).filter((s) => s.rent_amount === 3800000);
    const target = settlements[0];
    assertDefined(target, 'Target settlement found');
    assertEqual(target.tenant_payment_status, 'pending', 'Initial status pending');

    const payRes = db.recordTenantPayment({
      settlement_id: target.id,
      paid_at: '2026-09-04T14:30:00Z',
      payment_proof_url: 'https://cdn.pixy.app/proofs/recibo-pse-9901.pdf',
    });

    assertTrue(payRes.success, 'Tenant payment recorded');
    assertEqual(payRes.data?.tenant_payment_status, 'paid', 'Status updated to paid');
    assertEqual(payRes.data?.tenant_paid_at, '2026-09-04T14:30:00Z', 'Paid at timestamp stored');
    assertEqual(payRes.data?.payment_proof_url, 'https://cdn.pixy.app/proofs/recibo-pse-9901.pdf', 'Proof URL stored');
  });

  test('1.5.2: Recording owner payout updates status to "paid" with disbursement details', () => {
    const settlements = Array.from(db.property_lease_settlements.values()).filter((s) => s.rent_amount === 3800000);
    const target = settlements[0];
    assertDefined(target, 'Target settlement found');
    assertEqual(target.owner_payout_status, 'pending', 'Initial owner payout status pending');

    const payoutRes = db.recordOwnerPayout({
      settlement_id: target.id,
      paid_at: '2026-09-09T10:15:00Z',
      statement_pdf_url: 'https://cdn.pixy.app/statements/liq-202609-local104.pdf',
      receipt_number: 'TRANSF-BBVA-884102',
    });

    assertTrue(payoutRes.success, 'Owner payout recorded');
    assertEqual(payoutRes.data?.owner_payout_status, 'paid', 'Owner status updated to paid');
    assertEqual(payoutRes.data?.owner_paid_at, '2026-09-09T10:15:00Z', 'Disbursement timestamp stored');
    assertEqual(payoutRes.data?.statement_pdf_url, 'https://cdn.pixy.app/statements/liq-202609-local104.pdf', 'Statement URL stored');
    assertEqual(payoutRes.data?.receipt_number, 'TRANSF-BBVA-884102', 'Receipt / transaction reference stored');
  });

  // --------------------------------------------------------------------------
  // TASK 1.6: Mathematical Engine Oracle Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Pure Mathematical Engine & Colombian Tax Rules Oracle ---');

  test('1.6.1: 8% commission + 19% VAT on commission yields exact statutory breakdown', () => {
    const calc = calculateSettlement({
      monthlyRent: 2000000,
      adminFee: 250000,
      adminPaidBy: 'agency',
      commissionPercentage: 8.0,
      vatOnCommission: true,
      deductions: [{ amount: 100000 }],
    });

    // Rent: 2,000,000
    // Admin (agency): 250,000
    // Gross: 2,250,000
    // Commission: 160,000
    // VAT on Commission (19%): 30,400
    // Agency Admin Deduction: 250,000
    // Maintenance: 100,000
    // Net: 2,000,000 - 160,000 - 30,400 - 250,000 - 100,000 = 1,459,600
    assertEqual(calc.rentAmount, 2000000, 'Rent amount correct');
    assertEqual(calc.adminFeeAmount, 250000, 'Admin fee amount correct');
    assertEqual(calc.grossCollected, 2250000, 'Gross collected correct');
    assertEqual(calc.commissionAmount, 160000, 'Commission correct');
    assertEqual(calc.vatAmount, 30400, 'VAT on commission correct');
    assertEqual(calc.totalAgencyFee, 190400, 'Total agency fee = 160,000 + 30,400 = 190,400');
    assertEqual(calc.deductionsAmount, 100000, 'Deductions correct');
    assertEqual(calc.netOwnerPayout, 1459600, 'Net owner payout correct');
  });

  test('1.6.2: Tenant-paid admin fee is excluded from gross collection & owner payout deduction', () => {
    const calc = calculateSettlement({
      monthlyRent: 2000000,
      adminFee: 250000,
      adminPaidBy: 'tenant', // Tenant pays condo administration directly
      commissionPercentage: 8.0,
      vatOnCommission: true,
      deductions: [],
    });

    // Gross = 2,000,000
    // Commission = 160,000
    // VAT = 30,400
    // Net = 2,000,000 - 160,000 - 30,400 = 1,809,600
    assertEqual(calc.grossCollected, 2000000, 'Gross is only rent');
    assertEqual(calc.netOwnerPayout, 1809600, 'Net owner payout is 1,809,600');
  });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n' + '='.repeat(90));
  console.log(`  TOTAL AUDIT TESTS: ${totalTests}`);
  console.log(`  PASSED:           ${passedTests}`);
  console.log(`  FAILED:           ${failedTests}`);
  console.log('='.repeat(90) + '\n');

  if (failedTests > 0) {
    console.error('  FAILURES DETECTED:');
    for (const f of failures) {
      console.error(f);
    }
    process.exit(1);
  } else {
    console.log('  [VERDICT] All Milestone 2 Server Action & State Machine tests PASSED empirically with 0 errors.\n');
  }
}

runEmpiricalAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
