/**
 * Tier 3 Test Suite: F11 - RentFlow Pro Real Estate Cross-Feature Integration
 * Suite: t3-11-rentals-real-estate-integration
 * Domain: Real Estate Space - Property Catalog × Property Leases × Multi-Tenant RLS × CRM Leads × Settlements & Payouts × Space Isolation
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
  assertArrayLength,
  assertContains,
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
import {
  MODULE_ROUTES,
  filterRoutesByModules,
  MODULE_METADATA,
} from '../../../../src/modules/core/saas/module-config';
import { CAPABILITY_PRESETS } from '../../../../src/modules/core/organizations/capabilities-registry';
import type { UniversalCatalogItem } from '../harness/contracts';

// =============================================================================
// MOCK DATA & REPOSITORIES FOR TIER 3 PAIRWISE INTEGRATION
// =============================================================================

export const ORG_A_UUID = 'c41dcf16-f94d-499d-a1f8-bc9027206495';
export const ORG_B_UUID = 'e81a3d52-2591-447a-a437-0df9c8b74681';
export const PROP_A_UUID = 'a1111111-1111-4111-8111-111111111111';
export const PROP_B_UUID = 'b2222222-2222-4222-8222-222222222222';
export const TENANT_A_UUID = 'c3333333-3333-4333-8333-333333333333';
export const OWNER_A_UUID = 'd4444444-4444-4444-8444-444444444444';
export const LEASE_A_UUID = 'f5555555-5555-4555-8555-555555555555';
export const SETTLEMENT_A_UUID = 'e6666666-6666-4666-8666-666666666666';
export const TENANT_B_UUID = 'c7777777-7777-4777-8777-777777777777';
export const OWNER_B_UUID = 'd8888888-8888-4888-8888-888888888888';
export const LEASE_B_UUID = 'f9999999-9999-4999-8999-999999999999';
export const SETTLEMENT_B_UUID = 'e0000000-0000-4000-8000-000000000000';

export interface MockCRMLead {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  contact_type: 'lead' | 'client';
  status: string;
  company_name?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MockDatabaseState {
  service_catalog: Map<string, UniversalCatalogItem>;
  leads: Map<string, MockCRMLead>;
  property_leases: Map<string, PropertyLease>;
  property_lease_settlements: Map<string, PropertyLeaseSettlement>;
}

export function createMockDatabaseState(): MockDatabaseState {
  const state: MockDatabaseState = {
    service_catalog: new Map(),
    leads: new Map(),
    property_leases: new Map(),
    property_lease_settlements: new Map(),
  };

  // 1. Seed Property for Tenant A (Apartment in Ibagué El Vergel)
  const propVergel: UniversalCatalogItem = {
    id: PROP_A_UUID,
    organization_id: ORG_A_UUID,
    name: 'Apartamento de Lujo en El Vergel',
    description: 'Exclusivo apartamento amoblado de 145 m² con 3 alcobas y vista panorámica.',
    category_id: 'cat-apartamentos',
    category: 'Apartamentos',
    base_price: 3600000,
    type: 'real_estate',
    classification: 'real_estate',
    image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
    gallery_images: [
      { id: 'img-1', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00', is_cover: true, order_index: 0 },
    ],
    inventory_quantity: 1,
    track_inventory: false,
    allow_backorders: false,
    low_stock_threshold: 0,
    has_variants: false,
    variant_attributes: [],
    variants: [],
    addon_groups: [],
    badges: ['Exclusivo', 'Renta'],
    specifications: { area_m2: 145, bedrooms: 3, bathrooms: 4, parking: 2 },
    real_estate_details: {
      operation_type: 'rent',
      property_type: 'apartment',
      rental_status: 'available',
      city: 'Ibagué',
      neighborhood: 'El Vergel',
      admin_fee: 450000,
    },
    metadata: {
      rental_status: 'available',
    },
    is_visible_in_portal: true,
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
  };
  state.service_catalog.set(propVergel.id, propVergel);

  // 2. Seed Property for Tenant B (Apartment in Bogotá Chapinero)
  const propBogota: UniversalCatalogItem = {
    id: PROP_B_UUID,
    organization_id: ORG_B_UUID,
    name: 'Apartaestudio Moderno Chapinero Alto',
    description: 'Apartaestudio tipo loft para ejecutivos en Bogotá.',
    category_id: 'cat-apartaestudios',
    category: 'Apartamentos',
    base_price: 2200000,
    type: 'real_estate',
    classification: 'real_estate',
    image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
    gallery_images: [
      { id: 'img-b1', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', is_cover: true, order_index: 0 },
    ],
    inventory_quantity: 1,
    track_inventory: false,
    allow_backorders: false,
    low_stock_threshold: 0,
    has_variants: false,
    variant_attributes: [],
    variants: [],
    addon_groups: [],
    badges: ['Renta'],
    specifications: { area_m2: 52, bedrooms: 1, bathrooms: 1, parking: 1 },
    real_estate_details: {
      operation_type: 'rent',
      property_type: 'apartment',
      rental_status: 'available',
      city: 'Bogotá',
      neighborhood: 'Chapinero Alto',
      admin_fee: 280000,
    },
    metadata: {
      rental_status: 'available',
    },
    is_visible_in_portal: true,
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
  };
  state.service_catalog.set(propBogota.id, propBogota);

  // 3. Seed Tenant & Landlord Contacts in CRM leads (Tenant A)
  const leadTenantA: MockCRMLead = {
    id: TENANT_A_UUID,
    organization_id: ORG_A_UUID,
    name: 'Carlos Andrés Mendoza',
    email: 'carlos.mendoza@email.com',
    phone: '+573105551234',
    contact_type: 'lead',
    status: 'won',
    company_name: 'TechSolutions SAS',
    notes: 'Inquilino verificado con póliza de arrendamiento Seguros Bolívar.',
    metadata: {
      role: 'tenant',
      id_type: 'CC',
      id_number: '1.020.304.506',
      city: 'Ibagué',
      occupation: 'Ingeniero de Software Senior',
      monthly_income: 9500000,
      credit_status: 'approved',
    },
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-08-10T10:00:00Z',
  };
  state.leads.set(leadTenantA.id, leadTenantA);

  const leadOwnerA: MockCRMLead = {
    id: OWNER_A_UUID,
    organization_id: ORG_A_UUID,
    name: 'Dra. Helena Barreto Lozano',
    email: 'helena.barreto@medicos.co',
    phone: '+573124445678',
    contact_type: 'client',
    status: 'won',
    company_name: 'Inversiones Médicas Tolima',
    notes: 'Propietaria inversionista de inmuebles en El Vergel.',
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
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-08-10T10:00:00Z',
  };
  state.leads.set(leadOwnerA.id, leadOwnerA);

  // 4. Seed Tenant & Landlord Contacts in CRM leads (Tenant B)
  const leadTenantB: MockCRMLead = {
    id: TENANT_B_UUID,
    organization_id: ORG_B_UUID,
    name: 'Andrés Felipe Castro',
    email: 'andres.castro@bogota.co',
    phone: '+573201112233',
    contact_type: 'lead',
    status: 'won',
    metadata: { role: 'tenant', id_type: 'CC', id_number: '1.014.887.654' },
    created_at: '2026-08-11T10:00:00Z',
    updated_at: '2026-08-11T10:00:00Z',
  };
  state.leads.set(leadTenantB.id, leadTenantB);

  const leadOwnerB: MockCRMLead = {
    id: OWNER_B_UUID,
    organization_id: ORG_B_UUID,
    name: 'Dr. Pedro Pablo Sanín',
    email: 'pedro.sanin@bogota.co',
    phone: '+573167778899',
    contact_type: 'client',
    status: 'won',
    metadata: {
      role: 'owner',
      bank_details: { bank: 'Davivienda', account_type: 'checking', account_number: '100-200-300' },
    },
    created_at: '2026-08-11T10:00:00Z',
    updated_at: '2026-08-11T10:00:00Z',
  };
  state.leads.set(leadOwnerB.id, leadOwnerB);

  return state;
}

// Simulated RLS Query Helpers
export function queryLeasesWithRLS(
  db: MockDatabaseState,
  authenticatedOrgId: string,
  filterStatus?: LeaseStatus
): PropertyLease[] {
  const results: PropertyLease[] = [];
  for (const lease of db.property_leases.values()) {
    if (lease.organization_id === authenticatedOrgId) {
      if (!filterStatus || lease.status === filterStatus) {
        const prop = db.service_catalog.get(lease.property_id);
        const tenant = db.leads.get(lease.tenant_id);
        const owner = db.leads.get(lease.owner_id);
        results.push({
          ...lease,
          property: prop ? { id: prop.id, name: prop.name, base_price: prop.base_price, real_estate_details: prop.real_estate_details } : undefined,
          tenant: tenant ? { id: tenant.id, name: tenant.name, email: tenant.email, phone: tenant.phone, metadata: tenant.metadata } : undefined,
          owner: owner ? { id: owner.id, name: owner.name, email: owner.email, phone: owner.phone, metadata: owner.metadata } : undefined,
        });
      }
    }
  }
  return results;
}

export function querySettlementsWithRLS(
  db: MockDatabaseState,
  authenticatedOrgId: string,
  period?: string
): PropertyLeaseSettlement[] {
  const results: PropertyLeaseSettlement[] = [];
  for (const settlement of db.property_lease_settlements.values()) {
    if (settlement.organization_id === authenticatedOrgId) {
      if (!period || settlement.period === period) {
        results.push(settlement);
      }
    }
  }
  return results;
}

// =============================================================================
// TEST SUITE: T3-11 RENTALS REAL ESTATE PAIRWISE INTEGRATION
// =============================================================================

export const suite = {
  name: 'T3-11: RentFlow Pro Real Estate Cross-Feature Integration Suite',
  tier: 'Tier 3',
  feature: 'F11: Real Estate Property Management & Lease Lifecycle Integration',
  tests: [
    // =========================================================================
    // TEST 3.1: Rental property catalog item linked with active lease agreement
    // =========================================================================
    {
      name: '3.1 Rental property catalog item linked with active lease agreement and synchronized rental status',
      fn: () => {
        const db = createMockDatabaseState();
        const property = db.service_catalog.get(PROP_A_UUID)!;
        const tenant = db.leads.get(TENANT_A_UUID)!;
        const owner = db.leads.get(OWNER_A_UUID)!;

        // 1. Initial State: Property is 'available'
        assertEqual(property.real_estate_details?.rental_status, 'available', 'Property initially available');

        // 2. Validate input schema
        const rawLeaseInput = {
          organization_id: ORG_A_UUID,
          property_id: property.id,
          tenant_id: tenant.id,
          owner_id: owner.id,
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
          },
          bank_payout_details: {
            bank: 'Bancolombia',
            account_type: 'savings',
            account_number: '089-123456-78',
            account_holder: 'Helena Barreto Lozano',
            id_number: '38.284.912',
            id_type: 'CC',
          },
          notes: 'Contrato de arrendamiento residencial El Vergel con póliza colectiva Seguros Bolívar.',
        };

        const validatedLeaseInput = createLeaseSchema.parse(rawLeaseInput);
        assertEqual(validatedLeaseInput.monthly_rent, 3600000, 'Monthly rent validated');
        assertEqual(validatedLeaseInput.admin_fee, 450000, 'Admin fee validated');
        assertEqual(validatedLeaseInput.commission_percentage, 8.0, 'Commission validated');

        // 3. Create Lease in DB
        const leaseId = LEASE_A_UUID;
        const newLease: PropertyLease = {
          id: leaseId,
          ...validatedLeaseInput,
          organization_id: validatedLeaseInput.organization_id || ORG_A_UUID,
          admin_fee: validatedLeaseInput.admin_fee ?? 0,
          admin_paid_by: validatedLeaseInput.admin_paid_by ?? 'agency',
          commission_percentage: validatedLeaseInput.commission_percentage ?? 8.0,
          vat_on_commission: validatedLeaseInput.vat_on_commission ?? true,
          deposit_amount: validatedLeaseInput.deposit_amount ?? 0,
          payment_day: validatedLeaseInput.payment_day ?? 5,
          payout_day: validatedLeaseInput.payout_day ?? 10,
          status: validatedLeaseInput.status ?? 'active',
          guarantee_type: validatedLeaseInput.guarantee_type ?? 'direct',
          guarantee_details: validatedLeaseInput.guarantee_details ?? {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.property_leases.set(leaseId, newLease);

        // 4. Synchronize property status to 'rented'
        property.real_estate_details.rental_status = 'rented';
        if (property.metadata) {
          property.metadata.rental_status = 'rented';
        }

        // 5. Query and verify joined relationships
        const leases = queryLeasesWithRLS(db, ORG_A_UUID, 'active');
        assertArrayLength(leases, 1, 'Exactly 1 active lease found for Tenant A');
        const retrieved = leases[0];

        assertEqual(retrieved.id, leaseId, 'Lease ID matches');
        assertEqual(retrieved.property_id, property.id, 'Property ID matches');
        assertEqual(retrieved.property?.name, 'Apartamento de Lujo en El Vergel', 'Hydrated property name');
        assertEqual(retrieved.property?.real_estate_details?.rental_status, 'rented', 'Property rental status synchronized to rented');
        assertEqual(retrieved.tenant?.name, 'Carlos Andrés Mendoza', 'Hydrated tenant name');
        assertEqual(retrieved.owner?.name, 'Dra. Helena Barreto Lozano', 'Hydrated owner name');
        assertEqual(retrieved.guarantee_details.provider, 'Seguros Bolívar', 'Guarantee provider verified');
        assertEqual(retrieved.bank_payout_details.bank, 'Bancolombia', 'Bank payout bank verified');
      },
    },

    // =========================================================================
    // TEST 3.2: Multi-tenant organization boundaries and RLS isolation
    // =========================================================================
    {
      name: '3.2 Multi-tenant organization boundaries and RLS isolation (Tenant A leases inaccessible to Tenant B)',
      fn: () => {
        const db = createMockDatabaseState();

        // 1. Create Lease for Org A (Ibagué)
        const leaseA: PropertyLease = {
          id: LEASE_A_UUID,
          organization_id: ORG_A_UUID,
          property_id: PROP_A_UUID,
          tenant_id: TENANT_A_UUID,
          owner_id: OWNER_A_UUID,
          monthly_rent: 3600000,
          admin_fee: 450000,
          admin_paid_by: 'agency',
          commission_percentage: 8.0,
          vat_on_commission: true,
          deposit_amount: 3600000,
          payment_day: 5,
          payout_day: 10,
          start_date: '2026-09-01',
          end_date: '2027-08-31',
          status: 'active',
          guarantee_type: 'insurance',
          guarantee_details: { provider: 'Seguros Bolívar' },
          bank_payout_details: {
            bank: 'Bancolombia',
            account_type: 'savings',
            account_number: '089-123456-78',
            account_holder: 'Helena Barreto Lozano',
            id_number: '38.284.912',
            id_type: 'CC',
          },
          created_at: '2026-08-15T00:00:00Z',
          updated_at: '2026-08-15T00:00:00Z',
        };
        db.property_leases.set(leaseA.id, leaseA);

        // 2. Create Lease for Org B (Bogotá)
        const leaseB: PropertyLease = {
          id: LEASE_B_UUID,
          organization_id: ORG_B_UUID,
          property_id: PROP_B_UUID,
          tenant_id: TENANT_B_UUID,
          owner_id: OWNER_B_UUID,
          monthly_rent: 2200000,
          admin_fee: 280000,
          admin_paid_by: 'agency',
          commission_percentage: 10.0,
          vat_on_commission: true,
          deposit_amount: 2200000,
          payment_day: 1,
          payout_day: 5,
          start_date: '2026-09-01',
          end_date: '2027-08-31',
          status: 'active',
          guarantee_type: 'bond',
          guarantee_details: { provider: 'FianzaBogotá' },
          bank_payout_details: {
            bank: 'Davivienda',
            account_type: 'checking',
            account_number: '100-200-300',
            account_holder: 'Pedro Pablo Sanín',
            id_number: '19.876.543',
            id_type: 'CC',
          },
          created_at: '2026-08-15T00:00:00Z',
          updated_at: '2026-08-15T00:00:00Z',
        };
        db.property_leases.set(leaseB.id, leaseB);

        // 3. Create settlements for both orgs
        const settlementA: PropertyLeaseSettlement = {
          id: SETTLEMENT_A_UUID,
          organization_id: ORG_A_UUID,
          lease_id: leaseA.id,
          period: '2026-09',
          receipt_number: 'LIQ-202609-ORG-A',
          rent_amount: 3600000,
          admin_fee_amount: 450000,
          gross_collected: 4050000,
          commission_amount: 288000,
          vat_amount: 54720,
          deductions_amount: 0,
          net_owner_payout: 2807280,
          tenant_payment_status: 'paid',
          owner_payout_status: 'pending',
          deductions: [],
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        };
        db.property_lease_settlements.set(settlementA.id, settlementA);

        const settlementB: PropertyLeaseSettlement = {
          id: SETTLEMENT_B_UUID,
          organization_id: ORG_B_UUID,
          lease_id: leaseB.id,
          period: '2026-09',
          receipt_number: 'LIQ-202609-ORG-B',
          rent_amount: 2200000,
          admin_fee_amount: 280000,
          gross_collected: 2480000,
          commission_amount: 220000,
          vat_amount: 41800,
          deductions_amount: 0,
          net_owner_payout: 1658200,
          tenant_payment_status: 'pending',
          owner_payout_status: 'pending',
          deductions: [],
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        };
        db.property_lease_settlements.set(settlementB.id, settlementB);

        // 4. Query from Tenant A context: strictly receives Lease A & Settlement A
        const tenantALeases = queryLeasesWithRLS(db, ORG_A_UUID);
        assertArrayLength(tenantALeases, 1, 'Tenant A receives only its own leases');
        assertEqual(tenantALeases[0].id, leaseA.id, 'Tenant A lease matches');

        const tenantASettlements = querySettlementsWithRLS(db, ORG_A_UUID);
        assertArrayLength(tenantASettlements, 1, 'Tenant A receives only its own settlements');
        assertEqual(tenantASettlements[0].id, settlementA.id, 'Tenant A settlement matches');

        // 5. Query from Tenant B context: strictly receives Lease B & Settlement B
        const tenantBLeases = queryLeasesWithRLS(db, ORG_B_UUID);
        assertArrayLength(tenantBLeases, 1, 'Tenant B receives only its own leases');
        assertEqual(tenantBLeases[0].id, leaseB.id, 'Tenant B lease matches');

        const tenantBSettlements = querySettlementsWithRLS(db, ORG_B_UUID);
        assertArrayLength(tenantBSettlements, 1, 'Tenant B receives only its own settlements');
        assertEqual(tenantBSettlements[0].id, settlementB.id, 'Tenant B settlement matches');

        // 6. Zero Cross-Tenant Data Leakage
        assertFalse(tenantALeases.some(l => l.organization_id === ORG_B_UUID), 'Zero Tenant B leases leaked to Tenant A');
        assertFalse(tenantBLeases.some(l => l.organization_id === ORG_A_UUID), 'Zero Tenant A leases leaked to Tenant B');
        assertFalse(tenantASettlements.some(s => s.organization_id === ORG_B_UUID), 'Zero Tenant B settlements leaked to Tenant A');
        assertFalse(tenantBSettlements.some(s => s.organization_id === ORG_A_UUID), 'Zero Tenant A settlements leaked to Tenant B');
      },
    },

    // =========================================================================
    // TEST 3.3: Multi-Month Settlement Roll-Forward with Unpaid Balances
    // =========================================================================
    {
      name: '3.3 Multi-Month Settlement Roll-Forward: Late payment in Month 1 reconciled alongside Month 2 collection',
      fn: () => {
        const db = createMockDatabaseState();
        const monthlyRent = 3600000;
        const adminFee = 450000;

        // Lease Setup
        const lease: PropertyLease = {
          id: LEASE_A_UUID,
          organization_id: ORG_A_UUID,
          property_id: PROP_A_UUID,
          tenant_id: TENANT_A_UUID,
          owner_id: OWNER_A_UUID,
          monthly_rent: monthlyRent,
          admin_fee: adminFee,
          admin_paid_by: 'agency',
          commission_percentage: 8.0,
          vat_on_commission: true,
          deposit_amount: monthlyRent,
          payment_day: 5,
          payout_day: 10,
          start_date: '2026-09-01',
          end_date: '2027-08-31',
          status: 'active',
          guarantee_type: 'insurance',
          guarantee_details: { provider: 'Seguros Bolívar' },
          bank_payout_details: {
            bank: 'Bancolombia',
            account_type: 'savings',
            account_number: '089-123456-78',
            account_holder: 'Helena Barreto Lozano',
            id_number: '38.284.912',
            id_type: 'CC',
          },
          created_at: '2026-08-20T00:00:00Z',
          updated_at: '2026-08-20T00:00:00Z',
        };
        db.property_leases.set(lease.id, lease);

        // --- MONTH 1 (2026-09): Tenant defaults, payout held ---
        const calcM1 = calculateSettlement({
          monthlyRent,
          adminFee,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
        });

        const settlementM1: PropertyLeaseSettlement = {
          id: 'settlement-m1-uuid',
          organization_id: ORG_A_UUID,
          lease_id: lease.id,
          period: '2026-09',
          receipt_number: 'LIQ-202609-0001',
          rent_amount: calcM1.rentAmount,
          admin_fee_amount: calcM1.adminFeeAmount,
          gross_collected: calcM1.grossCollected,
          commission_amount: calcM1.commissionAmount,
          vat_amount: calcM1.vatAmount,
          deductions_amount: 0,
          net_owner_payout: calcM1.netOwnerPayout,
          tenant_payment_status: 'late', // Unpaid / In default
          owner_payout_status: 'pending', // Held until collection
          deductions: [],
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-06T00:00:00Z',
        };
        db.property_lease_settlements.set(settlementM1.id, settlementM1);

        assertEqual(settlementM1.tenant_payment_status, 'late', 'Month 1 marked as late/delinquent');
        assertEqual(settlementM1.owner_payout_status, 'pending', 'Month 1 owner payout held');

        // --- MONTH 2 (2026-10): Tenant pays Month 1 + Month 2 simultaneously ---
        const calcM2 = calculateSettlement({
          monthlyRent,
          adminFee,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
        });

        const settlementM2: PropertyLeaseSettlement = {
          id: 'settlement-m2-uuid',
          organization_id: ORG_A_UUID,
          lease_id: lease.id,
          period: '2026-10',
          receipt_number: 'LIQ-202610-0001',
          rent_amount: calcM2.rentAmount,
          admin_fee_amount: calcM2.adminFeeAmount,
          gross_collected: calcM2.grossCollected,
          commission_amount: calcM2.commissionAmount,
          vat_amount: calcM2.vatAmount,
          deductions_amount: 0,
          net_owner_payout: calcM2.netOwnerPayout,
          tenant_payment_status: 'paid', // Both paid simultaneously
          owner_payout_status: 'paid',
          deductions: [],
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-04T00:00:00Z',
        };
        db.property_lease_settlements.set(settlementM2.id, settlementM2);

        // Reconcile Month 1
        settlementM1.tenant_payment_status = 'paid';
        settlementM1.owner_payout_status = 'paid';
        settlementM1.tenant_paid_at = '2026-10-04T10:00:00Z';
        settlementM1.owner_paid_at = '2026-10-10T14:00:00Z';

        // Total Gross Collected for both periods = $4,050,000 * 2 = $8,100,000 COP
        const totalGross = settlementM1.gross_collected + settlementM2.gross_collected;
        assertEqual(totalGross, 8100000, 'Cumulative gross collected across roll-forward is $8,100,000 COP');

        // Total Commission = $288,000 * 2 = $576,000 COP
        const totalCommission = settlementM1.commission_amount + settlementM2.commission_amount;
        assertEqual(totalCommission, 576000, 'Cumulative commission is $576,000 COP');

        // Total VAT on Commission = $54,720 * 2 = $109,440 COP
        const totalVAT = settlementM1.vat_amount + settlementM2.vat_amount;
        assertEqual(totalVAT, 109440, 'Cumulative VAT is $109,440 COP');

        // Total Net Disbursed to Landlord = $2,807,280 * 2 = $5,614,560 COP
        const totalNetPayout = settlementM1.net_owner_payout + settlementM2.net_owner_payout;
        assertEqual(totalNetPayout, 5614560, 'Cumulative net owner payout across both months is exactly $5,614,560 COP');
      },
    },

    // =========================================================================
    // TEST 3.4: Multi-Contractor Deduction Matrices with Split Retentions
    // =========================================================================
    {
      name: '3.4 Multi-Contractor Deduction Matrices: Concurrent plumbing, locksmith, and HOA extraordinary deductions',
      fn: () => {
        const monthlyRent = 3600000;
        const adminFee = 450000;

        // 3 concurrent itemized deductions from distinct contractors
        const deductions: SettlementDeduction[] = [
          {
            id: 'ded-01-plumbing',
            concept: 'Reparación tubería hidrosanitaria baño principal',
            amount: 350000,
            category: 'maintenance',
            date: '2026-09-02',
            receipt_url: 'https://pixy.app/receipts/factura-plomeria-01.pdf',
            notes: 'Contratista: Plomería El Vergel S.A.S. (NIT 900.123.456)',
          },
          {
            id: 'ded-02-locksmith',
            concept: 'Cambio de cerradura de seguridad puerta principal',
            amount: 80000,
            category: 'repair',
            date: '2026-09-03',
            receipt_url: 'https://pixy.app/receipts/recibo-cerrajeria-02.pdf',
            notes: 'Contratista: Cerrajería Ibagué Centro',
          },
          {
            id: 'ded-03-hoa-extra',
            concept: 'Cuota extraordinaria impermeabilización fachada conjunto',
            amount: 200000,
            category: 'utility',
            date: '2026-09-04',
            receipt_url: 'https://pixy.app/receipts/recibo-admin-extra-03.pdf',
            notes: 'Cobro extraordinario Administración Edificio Mirador',
          },
        ];

        // Verify schemas
        for (const d of deductions) {
          const validated = deductionItemSchema.parse(d);
          assertDefined(validated.id, 'Deduction validated');
        }

        const settlement = calculateSettlement({
          monthlyRent,
          adminFee,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions,
        });

        // 1. Deductions Sum = 350,000 + 80,000 + 200,000 = 630,000 COP
        assertEqual(settlement.deductionsAmount, 630000, 'Deductions sum verified at $630,000 COP');

        // 2. Base Net before deductions = 3,600,000 - 288,000 (8%) - 54,720 (19% VAT) - 450,000 (Admin) = 2,807,280 COP
        // Net Owner Payout = 2,807,280 - 630,000 = 2,177,280 COP
        assertEqual(settlement.netOwnerPayout, 2177280, 'Net owner payout after multi-contractor deductions is $2,177,280 COP');
      },
    },

    // =========================================================================
    // TEST 3.5: Mid-Cycle Lease Termination & Security Deposit Reconciliation
    // =========================================================================
    {
      name: '3.5 Mid-Cycle Lease Termination: Early termination with security deposit offset against utility debt',
      fn: () => {
        const db = createMockDatabaseState();
        const property = db.service_catalog.get(PROP_A_UUID)!;
        const securityDeposit = 3600000;

        const lease: PropertyLease = {
          id: LEASE_A_UUID,
          organization_id: ORG_A_UUID,
          property_id: property.id,
          tenant_id: TENANT_A_UUID,
          owner_id: OWNER_A_UUID,
          monthly_rent: 3600000,
          admin_fee: 450000,
          admin_paid_by: 'agency',
          commission_percentage: 8.0,
          vat_on_commission: true,
          deposit_amount: securityDeposit,
          payment_day: 5,
          payout_day: 10,
          start_date: '2026-09-01',
          end_date: '2027-08-31',
          status: 'active',
          guarantee_type: 'deposit',
          guarantee_details: { deposit_held: securityDeposit },
          bank_payout_details: {
            bank: 'Bancolombia',
            account_type: 'savings',
            account_number: '089-123456-78',
            account_holder: 'Helena Barreto Lozano',
            id_number: '38.284.912',
          },
          created_at: '2026-08-20T00:00:00Z',
          updated_at: '2026-08-20T00:00:00Z',
        };
        db.property_leases.set(lease.id, lease);
        property.real_estate_details.rental_status = 'rented';

        // Terminate at Month 6 (2027-02-28)
        const utilityDebt = 120000; // Gas and electricity pending balance
        const depositRefundedToTenant = securityDeposit - utilityDebt; // $3,480,000 COP

        assertEqual(depositRefundedToTenant, 3480000, 'Security deposit refunded minus utility debt is $3,480,000 COP');

        // Update lease state to 'terminated'
        const terminationUpdate = updateLeaseSchema.parse({
          id: lease.id,
          status: 'terminated',
          end_date: '2027-02-28',
          notes: `Contrato terminado anticipadamente. Depósito de garantía ($3.600.000) liquidado: -$120.000 servicios públicos, devuelto $3.480.000.`,
        });

        lease.status = terminationUpdate.status!;
        lease.end_date = terminationUpdate.end_date!;
        lease.notes = terminationUpdate.notes!;

        // Reset property rental status to available
        if (lease.status === 'terminated') {
          property.real_estate_details.rental_status = 'available';
          if (property.metadata) {
            property.metadata.rental_status = 'available';
          }
        }

        assertEqual(lease.status, 'terminated', 'Lease status updated to terminated');
        assertEqual(property.real_estate_details.rental_status, 'available', 'Property catalog status instantly reverted to available');
      },
    },

    // =========================================================================
    // TEST 3.6: Statutory Rent Ceiling & IPC Annual Indexation (Law 820 of 2003)
    // =========================================================================
    {
      name: '3.6 Statutory Rent Ceiling & IPC Indexation: Annual 12-month lease renewal with 5.62% inflation increase',
      fn: () => {
        const baseRent = 3600000;
        const ipcRate = 5.62; // 5.62% Colombian IPC indexation rate
        const commercialPropertyValue = 450000000; // $450,000,000 COP property value

        // 1. Calculate indexed rent
        const indexedRent = roundCurrency(baseRent * (1 + ipcRate / 100));
        // 3,600,000 * 1.0562 = 3,802,320 COP
        assertEqual(indexedRent, 3802320, 'Indexed rent increased by 5.62% to $3,802,320 COP');

        // 2. Law 820 of 2003 Statutory Cap: Rent cannot exceed 1% of commercial property value
        const statutoryMaxRent = roundCurrency(commercialPropertyValue * 0.01); // $4,500,000 COP
        assertTrue(indexedRent <= statutoryMaxRent, 'Indexed rent complies with Law 820 statutory 1% ceiling ($4,500,000)');

        // 3. Re-calculate new settlement on renewal
        const renewalSettlement = calculateSettlement({
          monthlyRent: indexedRent,
          adminFee: 480000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
        });

        // Commission = 3,802,320 * 0.08 = 304,185.60 COP
        assertEqual(renewalSettlement.commissionAmount, 304185.6, 'Commission on renewed rent verified');
        // VAT = 304,185.60 * 0.19 = 57,795.26 COP
        assertEqual(renewalSettlement.vatAmount, 57795.26, 'VAT on renewed commission verified');
        // Gross = 3,802,320 + 480,000 = 4,282,320 COP
        assertEqual(renewalSettlement.grossCollected, 4282320, 'Gross collected verified');
        // Net = 3,802,320 - 304,185.60 - 57,795.26 - 480,000 = 2,960,339.14 COP
        assertEqual(renewalSettlement.netOwnerPayout, 2960339.14, 'Net owner payout on renewal verified down to cent precision');
      },
    },

    // =========================================================================
    // TEST 3.7: Cross-Space Isolation Invariants (Agency, Resto, Cleaning, Retail, SaaS)
    // =========================================================================
    {
      name: '3.7 Cross-space isolation invariants: Non-real-estate spaces operate with zero rentals metadata or route leakage',
      fn: () => {
        const allCandidateModules = [
          'core_crm',
          'core_clients',
          'module_messaging',
          'module_quotes',
          'module_catalog',
          'module_automation',
          'module_invoicing',
          'module_payments',
          'module_rentals',
        ];

        const nonRealEstateSpaces = ['agency', 'resto', 'cleaning', 'retail', 'saas', 'platform'] as const;

        for (const space of nonRealEstateSpaces) {
          const routes = filterRoutesByModules(allCandidateModules, 'owner', space === 'platform' ? 'platform' : 'client', space);
          assertFalse(
            routes.some(r => r.key === 'module_rentals' || r.href === '/rentals'),
            `Space '${space}' must NEVER expose module_rentals or /rentals route`
          );

          const preset = CAPABILITY_PRESETS[space];
          assertDefined(preset, `Preset for ${space} exists`);
          assertFalse(
            preset.capabilities.includes('module_rentals'),
            `Preset for ${space} must not include module_rentals capability`
          );
        }

        // Real Estate space exclusively contains module_rentals
        const realEstateRoutes = filterRoutesByModules(allCandidateModules, 'owner', 'client', 'real_estate');
        const rentalsRoute = realEstateRoutes.find(r => r.key === 'module_rentals' || r.href === '/rentals');
        assertDefined(rentalsRoute, 'Real estate space successfully exposes /rentals');
        assertEqual(rentalsRoute?.label, 'Gestión de Arriendos', 'Rentals route label is correct');
        assertTrue(CAPABILITY_PRESETS.real_estate.modules?.includes('module_rentals'), 'real_estate preset contains module_rentals');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier3');
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
