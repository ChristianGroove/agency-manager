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
        // Hydrate relations
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

        // 6. Zero Cross-Tenant Data Leakage: Verify no ID overlaps
        assertFalse(tenantALeases.some(l => l.organization_id === ORG_B_UUID), 'Zero Tenant B leases leaked to Tenant A');
        assertFalse(tenantBLeases.some(l => l.organization_id === ORG_A_UUID), 'Zero Tenant A leases leaked to Tenant B');
        assertFalse(tenantASettlements.some(s => s.organization_id === ORG_B_UUID), 'Zero Tenant B settlements leaked to Tenant A');
        assertFalse(tenantBSettlements.some(s => s.organization_id === ORG_A_UUID), 'Zero Tenant A settlements leaked to Tenant B');
      },
    },

    // =========================================================================
    // TEST 3.3: CRM Leads (tenant + owner) integration with lease contracts
    // =========================================================================
    {
      name: '3.3 CRM Leads (tenant + owner) integration with lease contracts without structural alterations to public.leads',
      fn: () => {
        const db = createMockDatabaseState();
        const tenant = db.leads.get(TENANT_A_UUID)!;
        const owner = db.leads.get(OWNER_A_UUID)!;

        // 1. Verify standard CRM columns without custom schema columns
        assertEqual(tenant.contact_type, 'lead', 'Tenant is stored in standard leads table as lead');
        assertEqual(owner.contact_type, 'client', 'Landlord is stored in standard leads table as client');

        // 2. Verify metadata holds specialized Real Estate and Banking details
        assertDefined(tenant.metadata, 'Tenant metadata defined');
        assertEqual(tenant.metadata?.role, 'tenant', 'Role is tenant in metadata');
        assertEqual(tenant.metadata?.id_number, '1.020.304.506', 'Tenant ID number stored in metadata');
        assertEqual(tenant.metadata?.monthly_income, 9500000, 'Tenant income stored in metadata');

        assertDefined(owner.metadata, 'Owner metadata defined');
        assertEqual(owner.metadata?.role, 'owner', 'Role is owner in metadata');
        assertEqual(owner.metadata?.id_number, '38.284.912', 'Owner ID number stored in metadata');
        assertEqual(owner.metadata?.bank_details?.bank, 'Bancolombia', 'Bank name stored in metadata');
        assertEqual(owner.metadata?.bank_details?.account_number, '089-123456-78', 'Account number stored in metadata');

        // 3. Link into lease agreement and verify integrity
        const lease: PropertyLease = {
          id: LEASE_A_UUID,
          organization_id: ORG_A_UUID,
          property_id: PROP_A_UUID,
          tenant_id: tenant.id,
          owner_id: owner.id,
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
          guarantee_details: { policy_number: 'BOL-9901' },
          bank_payout_details: owner.metadata?.bank_details || {
            bank: 'Bancolombia',
            account_type: 'savings',
            account_number: '089-123456-78',
            account_holder: 'Helena Barreto Lozano',
            id_number: '38.284.912',
            id_type: 'CC',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        db.property_leases.set(lease.id, lease);

        const hydrated = queryLeasesWithRLS(db, ORG_A_UUID)[0];
        assertEqual(hydrated.tenant?.name, 'Carlos Andrés Mendoza', 'Tenant name accessible via standard foreign key');
        assertEqual(hydrated.tenant?.phone, '+573105551234', 'Tenant phone accessible');
        assertEqual(hydrated.owner?.name, 'Dra. Helena Barreto Lozano', 'Owner name accessible via standard foreign key');
        assertEqual(hydrated.owner?.email, 'helena.barreto@medicos.co', 'Owner email accessible');
        assertEqual(hydrated.bank_payout_details.account_number, '089-123456-78', 'Bank payout details synced');
      },
    },

    // =========================================================================
    // TEST 3.4: Settlement creation with simultaneous maintenance deduction, payment logging, and owner payout
    // =========================================================================
    {
      name: '3.4 Settlement creation with simultaneous maintenance deduction, payment logging, and owner payout',
      fn: () => {
        const db = createMockDatabaseState();

        // 1. Setup Lease: $3,000,000 Rent, $350,000 Admin (Agency), 8% Commission ($240,000), 19% VAT ($45,600)
        const lease: PropertyLease = {
          id: LEASE_A_UUID,
          organization_id: ORG_A_UUID,
          property_id: PROP_A_UUID,
          tenant_id: TENANT_A_UUID,
          owner_id: OWNER_A_UUID,
          monthly_rent: 3000000,
          admin_fee: 350000,
          admin_paid_by: 'agency',
          commission_percentage: 8.0,
          vat_on_commission: true,
          deposit_amount: 3000000,
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.property_leases.set(lease.id, lease);

        // 2. Generate Initial Monthly Settlement for period 2026-09
        const initialCalc = calculateSettlement({
          monthlyRent: lease.monthly_rent,
          adminFee: lease.admin_fee,
          adminPaidBy: lease.admin_paid_by,
          commissionPercentage: lease.commission_percentage,
          vatOnCommission: lease.vat_on_commission,
          deductions: [],
        });

        // Gross = 3,000,000 + 350,000 = 3,350,000
        // Commission = 3,000,000 * 0.08 = 240,000
        // VAT = 240,000 * 0.19 = 45,600
        // Total Agency Fee = 285,600
        // Initial Net Owner Payout = 3,000,000 - 240,000 - 45,600 - 350,000 = 2,364,400 COP
        assertEqual(initialCalc.grossCollected, 3350000, 'Initial gross collected 3,350,000');
        assertEqual(initialCalc.commissionAmount, 240000, 'Commission 240,000');
        assertEqual(initialCalc.vatAmount, 45600, 'VAT 45,600');
        assertEqual(initialCalc.netOwnerPayout, 2364400, 'Initial net owner payout 2,364,400');

        const settlementId = SETTLEMENT_A_UUID;
        const settlement: PropertyLeaseSettlement = {
          id: settlementId,
          organization_id: ORG_A_UUID,
          lease_id: lease.id,
          period: '2026-09',
          receipt_number: 'LIQ-202609-VRG01',
          rent_amount: initialCalc.rentAmount,
          admin_fee_amount: initialCalc.adminFeeAmount,
          gross_collected: initialCalc.grossCollected,
          commission_amount: initialCalc.commissionAmount,
          vat_amount: initialCalc.vatAmount,
          deductions_amount: 0,
          net_owner_payout: initialCalc.netOwnerPayout,
          tenant_payment_status: 'pending',
          owner_payout_status: 'pending',
          deductions: [],
          created_at: '2026-09-01T08:00:00Z',
          updated_at: '2026-09-01T08:00:00Z',
        };
        db.property_lease_settlements.set(settlementId, settlement);

        // 3. Add Itemized Maintenance Deduction ($150,000 COP plumbing invoice)
        const deductionInput = {
          id: 'ded-plumbing-001',
          concept: 'Reparación tubería hidrosanitaria baño auxiliar',
          amount: 150000,
          category: 'maintenance',
          date: '2026-09-03',
          receipt_url: 'https://praxis.pixy.app/receipts/factura-plomeria-7788.pdf',
          notes: 'Factura autorizada por propietaria Dra. Helena Barreto.',
        };
        const parsedDeduction = deductionItemSchema.parse(deductionInput);
        settlement.deductions.push(parsedDeduction as SettlementDeduction);

        // Recalculate settlement with deduction
        const updatedCalc = calculateSettlement({
          monthlyRent: lease.monthly_rent,
          adminFee: lease.admin_fee,
          adminPaidBy: lease.admin_paid_by,
          commissionPercentage: lease.commission_percentage,
          vatOnCommission: lease.vat_on_commission,
          deductions: settlement.deductions,
        });

        settlement.deductions_amount = updatedCalc.deductionsAmount;
        settlement.net_owner_payout = updatedCalc.netOwnerPayout;

        // Net Owner Payout = 2,364,400 - 150,000 = 2,214,400 COP
        assertEqual(settlement.deductions_amount, 150000, 'Deductions amount is 150,000');
        assertEqual(settlement.net_owner_payout, 2214400, 'Net owner payout recalculates to 2,214,400');

        // 4. Record Tenant Rent Payment via PSE
        const paymentInput = recordTenantPaymentSchema.parse({
          settlement_id: settlement.id,
          paid_at: '2026-09-04T11:30:00Z',
          payment_proof_url: 'https://praxis.pixy.app/proofs/pse-receipt-202609.pdf',
          notes: 'Pago recibido exitosamente por PSE Bancolombia.',
        });
        settlement.tenant_payment_status = 'paid';
        settlement.tenant_paid_at = paymentInput.paid_at;
        settlement.payment_proof_url = paymentInput.payment_proof_url;
        assertEqual(settlement.tenant_payment_status, 'paid', 'Tenant payment status updated to paid');

        // 5. Record Owner Payout Disbursement to Landlord's Bancolombia Account
        const payoutInput = recordOwnerPayoutSchema.parse({
          settlement_id: settlement.id,
          paid_at: '2026-09-09T15:00:00Z',
          statement_pdf_url: 'https://praxis.pixy.app/statements/liq-202609-helena.pdf',
          payment_proof_url: 'https://praxis.pixy.app/proofs/transfer-bancolombia-202609.pdf',
          receipt_number: 'LIQ-202609-VRG01',
          notes: 'Transferencia realizada a Cta Ahorros Bancolombia 089-123456-78.',
        });
        settlement.owner_payout_status = 'paid';
        settlement.owner_paid_at = payoutInput.paid_at;
        settlement.statement_pdf_url = payoutInput.statement_pdf_url;

        assertEqual(settlement.owner_payout_status, 'paid', 'Owner payout status updated to paid');
        assertEqual(settlement.statement_pdf_url, 'https://praxis.pixy.app/statements/liq-202609-helena.pdf', 'Statement PDF URL attached');
      },
    },

    // =========================================================================
    // TEST 3.5: Space system isolation
    // =========================================================================
    {
      name: '3.5 Space system isolation: verifying non-real-estate spaces (agency, resto, retail, cleaning, saas) never expose module_rentals in routes',
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
          'module_rentals', // Candidate module
        ];

        // 1. Space: agency -> module_rentals MUST NOT be in routes
        const agencyRoutes = filterRoutesByModules(allCandidateModules, 'owner', 'client', 'agency');
        assertFalse(agencyRoutes.some(r => r.key === 'module_rentals' || r.href === '/rentals'), 'Agency space never exposes /rentals');

        // 2. Space: resto -> module_rentals MUST NOT be in routes
        const restoRoutes = filterRoutesByModules(allCandidateModules, 'owner', 'client', 'resto');
        assertFalse(restoRoutes.some(r => r.key === 'module_rentals' || r.href === '/rentals'), 'Resto space never exposes /rentals');

        // 3. Space: retail -> module_rentals MUST NOT be in routes
        const retailRoutes = filterRoutesByModules(allCandidateModules, 'owner', 'client', 'retail');
        assertFalse(retailRoutes.some(r => r.key === 'module_rentals' || r.href === '/rentals'), 'Retail space never exposes /rentals');

        // 4. Space: cleaning -> module_rentals MUST NOT be in routes
        const cleaningRoutes = filterRoutesByModules(allCandidateModules, 'owner', 'client', 'cleaning');
        assertFalse(cleaningRoutes.some(r => r.key === 'module_rentals' || r.href === '/rentals'), 'Cleaning space never exposes /rentals');

        // 5. Space: saas -> module_rentals MUST NOT be in routes
        const saasRoutes = filterRoutesByModules(allCandidateModules, 'owner', 'client', 'saas');
        assertFalse(saasRoutes.some(r => r.key === 'module_rentals' || r.href === '/rentals'), 'SaaS space never exposes /rentals');

        // 6. Space: platform -> module_rentals MUST NOT be in routes
        const platformRoutes = filterRoutesByModules(allCandidateModules, 'owner', 'platform', 'platform');
        assertFalse(platformRoutes.some(r => r.key === 'module_rentals' || r.href === '/rentals'), 'Platform space never exposes /rentals');

        // 7. Space: real_estate -> module_rentals MUST BE in routes
        const realEstateRoutes = filterRoutesByModules(allCandidateModules, 'owner', 'client', 'real_estate');
        const rentalsRoute = realEstateRoutes.find(r => r.key === 'module_rentals' || r.href === '/rentals');
        assertDefined(rentalsRoute, 'Real estate space successfully exposes /rentals');
        assertEqual(rentalsRoute?.label, 'Gestión de Arriendos', 'Rentals route label is correct');
        assertEqual(rentalsRoute?.category, 'operations', 'Rentals route category is operations');

        // 8. Verify Module Metadata Registry
        assertEqual(MODULE_METADATA.module_rentals.key, 'module_rentals', 'module_rentals registered in MODULE_METADATA');
        assertArrayLength(MODULE_METADATA.module_rentals.allowedSpaces || [], 1, 'allowedSpaces contains exactly 1 space');
        assertEqual((MODULE_METADATA.module_rentals.allowedSpaces || [])[0], 'real_estate', 'allowedSpaces is real_estate');

        // 9. Verify Capability Presets
        assertTrue(CAPABILITY_PRESETS.real_estate.modules?.includes('module_rentals'), 'real_estate preset contains module_rentals');
        assertFalse(CAPABILITY_PRESETS.agency.capabilities.includes('module_rentals'), 'agency preset does not contain module_rentals');
        assertFalse(CAPABILITY_PRESETS.resto.capabilities.includes('module_rentals'), 'resto preset does not contain module_rentals');
        assertFalse(CAPABILITY_PRESETS.cleaning.capabilities.includes('module_rentals'), 'cleaning preset does not contain module_rentals');
        assertFalse(CAPABILITY_PRESETS.retail.capabilities.includes('module_rentals'), 'retail preset does not contain module_rentals');
        assertFalse(CAPABILITY_PRESETS.saas.capabilities.includes('module_rentals'), 'saas preset does not contain module_rentals');
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

if (process.argv[1] && process.argv[1].endsWith('t3-11-rentals-real-estate-integration.test.ts')) {
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
      console.log('\nAll RentFlow Pro Tier 3 integration tests passed with 0 errors!\n');
      process.exit(0);
    }
  });
}
