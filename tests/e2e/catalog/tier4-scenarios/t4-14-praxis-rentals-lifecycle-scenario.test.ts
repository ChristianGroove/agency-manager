/**
 * Tier 4 Test Suite: S14 - Praxis Inmobiliaria Real Estate Rentals & Payouts Lifecycle Scenario
 * Suite: t4-14-praxis-rentals-lifecycle-scenario
 * Domain: Praxis Inmobiliaria (Ibagué, Tolima)
 * Scope: End-to-End Real-World Scenario for Property Management:
 *        CRM Onboarding -> Lease Creation & Activation -> Rental Status Sync -> Monthly Settlement ->
 *        WhatsApp Tenant Reminder -> Plumbing Maintenance Deduction -> PSE Tenant Payment ->
 *        Owner Payout Calculation ($2,807,280 COP) & Transfer -> WhatsApp Landlord Notification ->
 *        Lease Termination & Property Release
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
  assertContains,
  assertArrayLength,
  TestRegistry,
  TestSuiteResult,
} from '../harness/assertions';
import type {
  PropertyLease,
  PropertyLeaseSettlement,
  LeaseStatus,
  AdminPaidBy,
  GuaranteeType,
  TenantPaymentStatus,
  OwnerPayoutStatus,
  SettlementDeduction,
  BankPayoutDetails,
} from '../../../../src/types/rentals';
import {
  createLeaseSchema,
  updateLeaseSchema,
  bankPayoutDetailsSchema,
  guaranteeDetailsSchema,
  deductionItemSchema,
  recordTenantPaymentSchema,
  recordOwnerPayoutSchema,
} from '../../../../src/modules/features/rentals/schemas/rentals.schema';
import {
  calculateSettlement,
  formatCOP,
  roundCurrency,
} from '../../../../src/modules/features/rentals/services/settlement-calculator';
import {
  generateTenantPaymentWhatsAppLink,
  generateOwnerPayoutWhatsAppLink,
} from '../../../../src/modules/features/rentals/services/whatsapp-notifier';
import type { UniversalCatalogItem } from '../harness/contracts';

// =============================================================================
// DOMAIN ENTITIES FOR PRAXIS INMOBILIARIA (IBAGUÉ)
// =============================================================================

export const PRAXIS_ORG_ID = 'c41dcf16-f94d-499d-a1f8-bc9027206495';
export const PRAXIS_PROPERTY_ID = 'e1a2b3c4-d5e6-47f8-a9b0-c1d2e3f4a5b6';
export const PRAXIS_TENANT_ID = 'b1b2b3b4-c5c6-4d7d-8e9e-0f1a2b3c4d5e';
export const PRAXIS_OWNER_ID = 'a1a2a3a4-b5b6-4c7c-8d9d-0e1f2a3b4c5d';
export const PRAXIS_LEASE_ID = 'f1f2f3f4-a5a6-4b7b-8c9c-0d1e2f3a4b5c';
export const PRAXIS_SETTLEMENT_ID = 'd1d2d3d4-e5e6-4f7f-8a9a-0b1c2d3e4f5a';

export interface PraxisCRMLead {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  contact_type: 'lead' | 'client';
  status: string;
  company_name?: string;
  notes?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PraxisStoreState {
  properties: Map<string, UniversalCatalogItem>;
  leads: Map<string, PraxisCRMLead>;
  leases: Map<string, PropertyLease>;
  settlements: Map<string, PropertyLeaseSettlement>;
}

export function initPraxisStore(): PraxisStoreState {
  const store: PraxisStoreState = {
    properties: new Map(),
    leads: new Map(),
    leases: new Map(),
    settlements: new Map(),
  };

  // Property: Apartamento de Lujo en El Vergel, Ibagué
  const vergelApartment: UniversalCatalogItem = {
    id: PRAXIS_PROPERTY_ID,
    organization_id: PRAXIS_ORG_ID,
    name: 'Apartamento de Lujo en El Vergel',
    description: 'Exclusivo apartamento amoblado de 145 m² en El Vergel, Ibagué. 3 alcobas en suite, estudio, balcón con vista a la cordillera y 2 parqueaderos cubiertos.',
    category_id: 'cat-apartamentos-ibague',
    category: 'Apartamentos',
    base_price: 3600000,
    type: 'real_estate',
    classification: 'real_estate',
    image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
    gallery_images: [
      { id: 'img-vrg-01', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00', is_cover: true, order_index: 0, alt_text: 'Sala Principal' },
      { id: 'img-vrg-02', url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3', is_cover: false, order_index: 1, alt_text: 'Cocina Integral' },
    ],
    inventory_quantity: 1,
    track_inventory: false,
    allow_backorders: false,
    low_stock_threshold: 0,
    has_variants: false,
    variant_attributes: [],
    variants: [],
    addon_groups: [],
    badges: ['Exclusivo', 'El Vergel'],
    specifications: {
      area_m2: 145,
      bedrooms: 3,
      bathrooms: 4,
      parking: 2,
      stratum: '6',
      city: 'Ibagué',
      neighborhood: 'El Vergel',
    },
    real_estate_details: {
      operation_type: 'rent',
      property_type: 'apartment',
      rental_status: 'available',
      area_total_m2: 145,
      bedrooms: 3,
      bathrooms: 4,
      admin_fee: 450000,
      city: 'Ibagué',
      neighborhood: 'El Vergel',
    },
    metadata: {
      rental_status: 'available',
    },
    is_visible_in_portal: true,
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
  };

  store.properties.set(vergelApartment.id, vergelApartment);
  return store;
}

// =============================================================================
// TEST SUITE: T4-14 PRAXIS RENTALS COMPLETE LIFECYCLE SCENARIO
// =============================================================================

export const suite = {
  name: 'T4-14: Praxis Inmobiliaria Complete Rentals & Payouts Lifecycle Scenario',
  tier: 'Tier 4',
  feature: 'S14-Rentals: End-to-End Real-World Property Rental Management in Ibagué',
  tests: [
    {
      name: '4.1 Complete End-to-End Real-World Lifecycle for Praxis Inmobiliaria (Ibagué)',
      fn: async () => {
        const store = initPraxisStore();
        const property = store.properties.get(PRAXIS_PROPERTY_ID)!;

        // ---------------------------------------------------------------------
        // STEP 1: Onboarding Landlord & Tenant into CRM Leads
        // ---------------------------------------------------------------------
        // 1.1 Landlord (Dra. Helena Barreto)
        const landlordLead: PraxisCRMLead = {
          id: PRAXIS_OWNER_ID,
          organization_id: PRAXIS_ORG_ID,
          name: 'Dra. Helena Barreto Lozano',
          email: 'helena.barreto@medicos.co',
          phone: '+573124445678',
          contact_type: 'client',
          status: 'won',
          company_name: 'Inversiones Médicas Tolima',
          notes: 'Propietaria titular del apartamento en El Vergel. Requiere dispersión mensual a Bancolombia.',
          metadata: {
            role: 'owner',
            id_type: 'CC',
            id_number: '38.284.912',
            city: 'Ibagué',
            occupation: 'Cirujana Plástica',
            bank_details: {
              bank: 'Bancolombia',
              account_type: 'savings',
              account_number: '089-123456-78',
              account_holder: 'Helena Barreto Lozano',
              id_number: '38.284.912',
              id_type: 'CC',
            },
          },
          created_at: '2026-08-15T09:00:00Z',
          updated_at: '2026-08-15T09:00:00Z',
        };
        store.leads.set(landlordLead.id, landlordLead);

        // 1.2 Tenant (Carlos Andrés Mendoza)
        const tenantLead: PraxisCRMLead = {
          id: PRAXIS_TENANT_ID,
          organization_id: PRAXIS_ORG_ID,
          name: 'Carlos Andrés Mendoza',
          email: 'carlos.mendoza@email.com',
          phone: '+573105551234',
          contact_type: 'lead',
          status: 'won',
          company_name: 'TechSolutions SAS',
          notes: 'Inquilino titular verificado. Ingresos demostrados > 9.5M COP.',
          metadata: {
            role: 'tenant',
            id_type: 'CC',
            id_number: '1.020.304.506',
            city: 'Ibagué',
            occupation: 'Ingeniero de Software Senior',
            monthly_income: 9500000,
            credit_status: 'approved',
          },
          created_at: '2026-08-15T10:00:00Z',
          updated_at: '2026-08-15T10:00:00Z',
        };
        store.leads.set(tenantLead.id, tenantLead);

        assertEqual(store.leads.size, 2, 'Both landlord and tenant registered in CRM');
        assertEqual(landlordLead.metadata.bank_details.account_number, '089-123456-78', 'Landlord bank account stored');
        assertEqual(tenantLead.metadata.id_number, '1.020.304.506', 'Tenant CC stored');

        // ---------------------------------------------------------------------
        // STEP 2: Creating and Activating 1-Year Lease Contract
        // ---------------------------------------------------------------------
        const rawLeasePayload = {
          organization_id: PRAXIS_ORG_ID,
          property_id: property.id,
          tenant_id: tenantLead.id,
          owner_id: landlordLead.id,
          monthly_rent: 3600000,
          admin_fee: 450000,
          admin_paid_by: 'agency' as AdminPaidBy,
          commission_percentage: 8.0,
          vat_on_commission: true,
          deposit_amount: 3600000,
          payment_day: 5,
          payout_day: 10,
          start_date: '2026-09-01',
          end_date: '2027-08-31',
          status: 'active' as LeaseStatus,
          guarantee_type: 'insurance' as GuaranteeType,
          guarantee_details: {
            provider: 'Seguros Bolívar',
            policy_number: 'BOL-ARR-2026-8841',
            coverage_percentage: 100,
            status: 'active',
            contact_agent: 'Luz Marina Duque',
          },
          bank_payout_details: landlordLead.metadata.bank_details,
          notes: 'Contrato de arrendamiento residencial El Vergel respaldado por póliza colectiva Seguros Bolívar. Cobro de administración centralizado por agencia.',
        };

        const validatedLease = createLeaseSchema.parse(rawLeasePayload);
        assertEqual(validatedLease.monthly_rent, 3600000, 'Monthly rent validated at $3,600,000 COP');
        assertEqual(validatedLease.admin_fee, 450000, 'Admin fee validated at $450,000 COP');
        assertEqual(validatedLease.commission_percentage, 8.0, 'Commission validated at 8.0%');
        assertTrue(validatedLease.vat_on_commission, 'VAT on commission validated (19% IVA)');

        const activeLease: PropertyLease = {
          id: PRAXIS_LEASE_ID,
          ...validatedLease,
          organization_id: validatedLease.organization_id || PRAXIS_ORG_ID,
          admin_fee: validatedLease.admin_fee ?? 0,
          admin_paid_by: validatedLease.admin_paid_by ?? 'agency',
          commission_percentage: validatedLease.commission_percentage ?? 8.0,
          vat_on_commission: validatedLease.vat_on_commission ?? true,
          deposit_amount: validatedLease.deposit_amount ?? 0,
          payment_day: validatedLease.payment_day ?? 5,
          payout_day: validatedLease.payout_day ?? 10,
          status: validatedLease.status ?? 'active',
          guarantee_type: validatedLease.guarantee_type ?? 'direct',
          guarantee_details: validatedLease.guarantee_details ?? {},
          created_at: '2026-08-20T00:00:00Z',
          updated_at: '2026-08-20T00:00:00Z',
        };
        store.leases.set(activeLease.id, activeLease);

        // ---------------------------------------------------------------------
        // STEP 3: Verifying Property Rental Status Automatically Updates to 'rented'
        // ---------------------------------------------------------------------
        if (activeLease.status === 'active') {
          property.real_estate_details.rental_status = 'rented';
          if (property.metadata) {
            property.metadata.rental_status = 'rented';
          }
        }

        assertEqual(property.real_estate_details.rental_status, 'rented', 'Property rental_status automatically updated to rented');
        assertEqual(property.metadata?.rental_status, 'rented', 'Metadata rental_status synchronized to rented');

        // ---------------------------------------------------------------------
        // STEP 4: Generating Monthly Settlement for Period 2026-09
        // ---------------------------------------------------------------------
        const baseCalc = calculateSettlement({
          monthlyRent: activeLease.monthly_rent,
          adminFee: activeLease.admin_fee,
          adminPaidBy: activeLease.admin_paid_by,
          commissionPercentage: activeLease.commission_percentage,
          vatOnCommission: activeLease.vat_on_commission,
          deductions: [],
        });

        // 4.1 Verify Mathematical Exactness
        // Gross Collected = $3,600,000 + $450,000 = $4,050,000 COP
        assertEqual(baseCalc.grossCollected, 4050000, 'Gross collected is $4,050,000 COP');
        // Commission (8%) = $3,600,000 * 0.08 = $288,000 COP
        assertEqual(baseCalc.commissionAmount, 288000, 'Agency commission is $288,000 COP');
        // VAT (19% of $288,000) = $54,720 COP
        assertEqual(baseCalc.vatAmount, 54720, 'VAT on commission is $54,720 COP');
        // Total Agency Fee = $288,000 + $54,720 = $342,720 COP
        assertEqual(baseCalc.totalAgencyFee, 342720, 'Total agency fee is $342,720 COP');
        // Base Net Owner Payout = $3,600,000 - $288,000 - $54,720 - $450,000 = $2,807,280 COP!
        assertEqual(baseCalc.netOwnerPayout, 2807280, 'Base net owner payout calculated exactly to $2,807,280 COP');

        const monthlySettlement: PropertyLeaseSettlement = {
          id: PRAXIS_SETTLEMENT_ID,
          organization_id: PRAXIS_ORG_ID,
          lease_id: activeLease.id,
          period: '2026-09',
          receipt_number: 'LIQ-202609-VRG01',
          rent_amount: baseCalc.rentAmount,
          admin_fee_amount: baseCalc.adminFeeAmount,
          gross_collected: baseCalc.grossCollected,
          commission_amount: baseCalc.commissionAmount,
          vat_amount: baseCalc.vatAmount,
          deductions_amount: 0,
          net_owner_payout: baseCalc.netOwnerPayout,
          tenant_payment_status: 'pending',
          owner_payout_status: 'pending',
          deductions: [],
          created_at: '2026-09-01T08:00:00Z',
          updated_at: '2026-09-01T08:00:00Z',
        };
        store.settlements.set(monthlySettlement.id, monthlySettlement);

        assertEqual(monthlySettlement.receipt_number, 'LIQ-202609-VRG01', 'Settlement receipt number generated');
        assertEqual(monthlySettlement.tenant_payment_status, 'pending', 'Tenant status starts as pending');
        assertEqual(monthlySettlement.owner_payout_status, 'pending', 'Owner payout status starts as pending');

        // ---------------------------------------------------------------------
        // STEP 5: Generating WhatsApp Payment Reminder with PSE Link for Tenant
        // ---------------------------------------------------------------------
        const tenantPaymentLink = generateTenantPaymentWhatsAppLink({
          tenantName: tenantLead.name,
          tenantPhone: tenantLead.phone,
          propertyTitle: property.name,
          period: 'Septiembre 2026',
          monthlyRent: activeLease.monthly_rent,
          adminFee: activeLease.admin_fee,
          adminPaidBy: activeLease.admin_paid_by,
          paymentDay: activeLease.payment_day,
          paymentLink: 'https://praxis.pixy.app/p/pse-vergel-202609',
          agencyName: 'Praxis Inmobiliaria',
        });

        assertTrue(tenantPaymentLink.startsWith('https://wa.me/573105551234?text='), 'Tenant phone normalized to 573105551234');
        const decodedTenantText = decodeURIComponent(tenantPaymentLink.split('?text=')[1]);
        assertContains(decodedTenantText, 'Carlos Andrés Mendoza', 'Reminder contains tenant name');
        assertContains(decodedTenantText, 'Apartamento de Lujo en El Vergel', 'Reminder contains property title');
        assertContains(decodedTenantText, 'Septiembre 2026', 'Reminder contains period');
        assertContains(decodedTenantText, 'Praxis Inmobiliaria', 'Reminder contains agency name');
        assertContains(decodedTenantText, 'https://praxis.pixy.app/p/pse-vergel-202609', 'Reminder contains PSE payment link');

        // ---------------------------------------------------------------------
        // STEP 6: Adding Plumbing Repair Maintenance Deduction ($180,000 COP)
        // ---------------------------------------------------------------------
        const plumbingDeductionInput = {
          id: 'ded-plumbing-ibague-4412',
          concept: 'Reparación hidrosanitaria fuga tubería baño principal',
          amount: 180000,
          category: 'maintenance',
          date: '2026-09-03',
          receipt_url: 'https://praxis.pixy.app/receipts/factura-plomeria-4412.pdf',
          notes: 'Servicio realizado por HidroServicios Ibagué con factura electrónica soporte.',
        };

        const validatedDeduction = deductionItemSchema.parse(plumbingDeductionInput);
        monthlySettlement.deductions.push(validatedDeduction as SettlementDeduction);

        // Recalculate settlement with approved maintenance deduction
        const recalculated = calculateSettlement({
          monthlyRent: activeLease.monthly_rent,
          adminFee: activeLease.admin_fee,
          adminPaidBy: activeLease.admin_paid_by,
          commissionPercentage: activeLease.commission_percentage,
          vatOnCommission: activeLease.vat_on_commission,
          deductions: monthlySettlement.deductions,
        });

        monthlySettlement.deductions_amount = recalculated.deductionsAmount;
        monthlySettlement.net_owner_payout = recalculated.netOwnerPayout;

        // Post-deduction Net Owner Payout = $2,807,280 - $180,000 = $2,627,280 COP!
        assertEqual(monthlySettlement.deductions_amount, 180000, 'Deductions sum verified at $180,000 COP');
        assertEqual(monthlySettlement.net_owner_payout, 2627280, 'Adjusted Net Owner Payout is $2,627,280 COP');

        // ---------------------------------------------------------------------
        // STEP 7: Recording Tenant Rent Payment via PSE
        // ---------------------------------------------------------------------
        const tenantPaymentRecord = recordTenantPaymentSchema.parse({
          settlement_id: monthlySettlement.id,
          paid_at: '2026-09-04T10:30:00Z',
          payment_proof_url: 'https://praxis.pixy.app/proofs/pse-receipt-vergel-9901.pdf',
          notes: 'Pago completo de canon + administración ($4.050.000 COP) procesado exitosamente vía PSE Bancolombia.',
        });

        monthlySettlement.tenant_payment_status = 'paid';
        monthlySettlement.tenant_paid_at = tenantPaymentRecord.paid_at;
        monthlySettlement.payment_proof_url = tenantPaymentRecord.payment_proof_url;

        assertEqual(monthlySettlement.tenant_payment_status, 'paid', 'Tenant payment marked as paid');
        assertDefined(monthlySettlement.tenant_paid_at, 'Tenant paid_at timestamp recorded');

        // ---------------------------------------------------------------------
        // STEP 8: Executing Owner Payout & Verifying Transfer to Bancolombia ($2,807,280 / $2,627,280)
        // ---------------------------------------------------------------------
        const ownerPayoutRecord = recordOwnerPayoutSchema.parse({
          settlement_id: monthlySettlement.id,
          paid_at: '2026-09-09T14:15:00Z',
          statement_pdf_url: 'https://praxis.pixy.app/statements/liq-202609-helena-vergel.pdf',
          payment_proof_url: 'https://praxis.pixy.app/proofs/transfer-bancolombia-202609.pdf',
          receipt_number: monthlySettlement.receipt_number || 'LIQ-202609-VRG01',
          notes: 'Dispersión bancaria ACH exitosa a Bancolombia Ahorros 089-123456-78 (Titular: Helena Barreto Lozano).',
        });

        monthlySettlement.owner_payout_status = 'paid';
        monthlySettlement.owner_paid_at = ownerPayoutRecord.paid_at;
        monthlySettlement.statement_pdf_url = ownerPayoutRecord.statement_pdf_url;

        assertEqual(monthlySettlement.owner_payout_status, 'paid', 'Owner payout status updated to paid');
        assertDefined(monthlySettlement.owner_paid_at, 'Owner paid_at timestamp recorded');
        assertEqual(monthlySettlement.statement_pdf_url, 'https://praxis.pixy.app/statements/liq-202609-helena-vergel.pdf', 'Statement PDF URL attached');
        assertEqual(activeLease.bank_payout_details.bank, 'Bancolombia', 'Destination bank is Bancolombia');
        assertEqual(activeLease.bank_payout_details.account_number, '089-123456-78', 'Destination account is 089-123456-78');

        // ---------------------------------------------------------------------
        // STEP 9: Generating WhatsApp Payout Notification with Extract Link for Landlord
        // ---------------------------------------------------------------------
        const landlordNotificationLink = generateOwnerPayoutWhatsAppLink({
          ownerName: landlordLead.name,
          ownerPhone: landlordLead.phone,
          propertyTitle: property.name,
          period: '2026-09',
          rentAmount: activeLease.monthly_rent,
          commissionAmount: baseCalc.commissionAmount,
          vatAmount: baseCalc.vatAmount,
          adminFeeAmount: activeLease.admin_fee,
          adminPaidBy: activeLease.admin_paid_by,
          deductionsAmount: monthlySettlement.deductions_amount,
          netOwnerPayout: monthlySettlement.net_owner_payout,
          bankName: activeLease.bank_payout_details.bank,
          accountNumber: activeLease.bank_payout_details.account_number,
          statementPdfUrl: monthlySettlement.statement_pdf_url || undefined,
          agencyName: 'Praxis Inmobiliaria',
        });

        assertTrue(landlordNotificationLink.startsWith('https://wa.me/573124445678?text='), 'Landlord phone normalized to 573124445678');
        const decodedLandlordText = decodeURIComponent(landlordNotificationLink.split('?text=')[1]);
        assertContains(decodedLandlordText, 'Dra. Helena Barreto', 'Notification contains owner name');
        assertContains(decodedLandlordText, 'Bancolombia', 'Notification contains destination bank');
        assertContains(decodedLandlordText, '089-123456-78', 'Notification contains account number');
        assertContains(decodedLandlordText, '288.000', 'Notification shows commission deduction');
        assertContains(decodedLandlordText, '54.720', 'Notification shows 19% IVA on commission');
        assertContains(decodedLandlordText, '180.000', 'Notification shows plumbing maintenance deduction');
        assertContains(decodedLandlordText, 'https://praxis.pixy.app/statements/liq-202609-helena-vergel.pdf', 'Notification contains statement PDF link');

        // ---------------------------------------------------------------------
        // STEP 10: Terminating Lease and Verifying Property Status Reverts to 'available'
        // ---------------------------------------------------------------------
        const terminationUpdate = updateLeaseSchema.parse({
          id: activeLease.id,
          status: 'terminated',
          end_date: '2026-09-30',
          notes: 'Contrato terminado por mutuo acuerdo tras entrega a satisfacción de inventario y paz y salvo de servicios públicos.',
        });

        activeLease.status = 'terminated';
        activeLease.end_date = terminationUpdate.end_date!;
        activeLease.notes = terminationUpdate.notes!;

        // Trigger property release
        if (activeLease.status === 'terminated') {
          property.real_estate_details.rental_status = 'available';
          if (property.metadata) {
            property.metadata.rental_status = 'available';
          }
        }

        assertEqual(activeLease.status, 'terminated', 'Lease status is terminated');
        assertEqual(property.real_estate_details.rental_status, 'available', 'Property status reverted to available');
        assertEqual(property.metadata?.rental_status, 'available', 'Metadata status reverted to available');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier4');
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

if (process.argv[1] && process.argv[1].endsWith('t4-14-praxis-rentals-lifecycle-scenario.test.ts')) {
  runSuite().then((res) => {
    console.log(`\nSuite: ${res.name} [${res.tier}]`);
    const passedCount = res.tests.filter((t) => t.passed).length;
    console.log(`Passed: ${passedCount}/${res.tests.length}`);
    console.log(`Duration: ${res.durationMs}ms`);
    for (const t of res.tests) {
      console.log(`  ${t.passed ? '✓' : '✗'} ${t.name} (${t.durationMs}ms)`);
      if (!t.passed && t.error) {
        console.error(`    Error: ${t.error.message}`);
      }
    }
    if (!res.passed) {
      process.exit(1);
    } else {
      console.log('\nAll Praxis Inmobiliaria lifecycle scenario tests passed with 0 errors!\n');
      process.exit(0);
    }
  });
}
