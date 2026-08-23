/**
 * Tier 4 Test Suite: S14 - Praxis Inmobiliaria Real Estate Rentals & Payouts Lifecycle Scenario
 * Suite: t4-14-praxis-rentals-lifecycle-scenario
 * Domain: Praxis Inmobiliaria (Ibagué, Tolima)
 * Scope: End-to-End Real-World Scenario for Property Management:
 *        1. Complete Single-Unit 10-Step Lifecycle
 *        2. 12-Month Multi-Unit Portfolio Simulation (48 Periods across 4 Properties in Ibagué)
 *        3. Insured Default Claim & Siniestro Aseguradora Workflow with Seguros Bolívar
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

  // Property 1: Apartamento de Lujo en El Vergel, Ibagué
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

  // Property 2: Casa Campestre en Calambeo, Ibagué
  const calambeoHouse: UniversalCatalogItem = {
    id: 'prop-calambeo-uuid',
    organization_id: PRAXIS_ORG_ID,
    name: 'Casa Campestre en Calambeo',
    description: 'Hermosa casa campestre de 280 m² con jardín privado, BBQ y piscina.',
    category_id: 'cat-casas-ibague',
    category: 'Casas',
    base_price: 5200000,
    type: 'real_estate',
    classification: 'real_estate',
    gallery_images: [],
    inventory_quantity: 1,
    track_inventory: false,
    allow_backorders: false,
    low_stock_threshold: 0,
    has_variants: false,
    variant_attributes: [],
    variants: [],
    addon_groups: [],
    badges: ['Campestre', 'Calambeo'],
    specifications: { area_m2: 280, bedrooms: 4, bathrooms: 5, parking: 4 },
    real_estate_details: {
      operation_type: 'rent',
      property_type: 'house',
      rental_status: 'available',
      admin_fee: 600000,
      city: 'Ibagué',
      neighborhood: 'Calambeo',
    },
    metadata: { rental_status: 'available' },
    is_visible_in_portal: true,
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
  };
  store.properties.set(calambeoHouse.id, calambeoHouse);

  // Property 3: Local Comercial en Piedra Pintada, Ibagué
  const piedraPintadaLocal: UniversalCatalogItem = {
    id: 'prop-piedra-pintada-uuid',
    organization_id: PRAXIS_ORG_ID,
    name: 'Local Comercial en Piedra Pintada',
    description: 'Local esquinero de alto flujo comercial sobre vía principal.',
    category_id: 'cat-locales-ibague',
    category: 'Oficinas & Locales',
    base_price: 4800000,
    type: 'real_estate',
    classification: 'real_estate',
    gallery_images: [],
    inventory_quantity: 1,
    track_inventory: false,
    allow_backorders: false,
    low_stock_threshold: 0,
    has_variants: false,
    variant_attributes: [],
    variants: [],
    addon_groups: [],
    badges: ['Comercial'],
    specifications: { area_m2: 120, bathrooms: 2, parking: 3 },
    real_estate_details: {
      operation_type: 'rent',
      property_type: 'commercial',
      rental_status: 'available',
      admin_fee: 550000,
      city: 'Ibagué',
      neighborhood: 'Piedra Pintada',
    },
    metadata: { rental_status: 'available' },
    is_visible_in_portal: true,
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
  };
  store.properties.set(piedraPintadaLocal.id, piedraPintadaLocal);

  // Property 4: Apartaestudio en Santa Ana, Ibagué
  const santaAnaStudio: UniversalCatalogItem = {
    id: 'prop-santa-ana-uuid',
    organization_id: PRAXIS_ORG_ID,
    name: 'Apartaestudio en Santa Ana',
    description: 'Cómodo apartaestudio amoblado para universitarios o ejecutivos.',
    category_id: 'cat-apartaestudios-ibague',
    category: 'Apartamentos',
    base_price: 1800000,
    type: 'real_estate',
    classification: 'real_estate',
    gallery_images: [],
    inventory_quantity: 1,
    track_inventory: false,
    allow_backorders: false,
    low_stock_threshold: 0,
    has_variants: false,
    variant_attributes: [],
    variants: [],
    addon_groups: [],
    badges: ['Santa Ana'],
    specifications: { area_m2: 45, bedrooms: 1, bathrooms: 1, parking: 1 },
    real_estate_details: {
      operation_type: 'rent',
      property_type: 'apartment',
      rental_status: 'available',
      admin_fee: 200000,
      city: 'Ibagué',
      neighborhood: 'Santa Ana',
    },
    metadata: { rental_status: 'available' },
    is_visible_in_portal: true,
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
  };
  store.properties.set(santaAnaStudio.id, santaAnaStudio);

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
    // =========================================================================
    // SCENARIO 4.1: Complete End-to-End Real-World Lifecycle (10 Steps)
    // =========================================================================
    {
      name: '4.1 Complete End-to-End Real-World Lifecycle for Praxis Inmobiliaria (Ibagué)',
      fn: async () => {
        const store = initPraxisStore();
        const property = store.properties.get(PRAXIS_PROPERTY_ID)!;

        // 1. Onboard Landlord & Tenant
        const landlordLead: PraxisCRMLead = {
          id: PRAXIS_OWNER_ID,
          organization_id: PRAXIS_ORG_ID,
          name: 'Dra. Helena Barreto Lozano',
          email: 'helena.barreto@medicos.co',
          phone: '+573124445678',
          contact_type: 'client',
          status: 'won',
          company_name: 'Inversiones Médicas Tolima',
          notes: 'Propietaria titular del apartamento en El Vergel.',
          metadata: {
            role: 'owner',
            id_type: 'CC',
            id_number: '38.284.912',
            city: 'Ibagué',
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

        const tenantLead: PraxisCRMLead = {
          id: PRAXIS_TENANT_ID,
          organization_id: PRAXIS_ORG_ID,
          name: 'Carlos Andrés Mendoza',
          email: 'carlos.mendoza@email.com',
          phone: '+573105551234',
          contact_type: 'lead',
          status: 'won',
          company_name: 'TechSolutions SAS',
          notes: 'Inquilino titular verificado.',
          metadata: {
            role: 'tenant',
            id_type: 'CC',
            id_number: '1.020.304.506',
            city: 'Ibagué',
            monthly_income: 9500000,
          },
          created_at: '2026-08-15T10:00:00Z',
          updated_at: '2026-08-15T10:00:00Z',
        };
        store.leads.set(tenantLead.id, tenantLead);

        // 2. Create Lease
        const validatedLease = createLeaseSchema.parse({
          organization_id: PRAXIS_ORG_ID,
          property_id: property.id,
          tenant_id: tenantLead.id,
          owner_id: landlordLead.id,
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
          guarantee_details: {
            provider: 'Seguros Bolívar',
            policy_number: 'BOL-ARR-2026-8841',
            coverage_percentage: 100,
          },
          bank_payout_details: landlordLead.metadata.bank_details,
        });

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

        // 3. Status Sync
        property.real_estate_details.rental_status = 'rented';
        assertEqual(property.real_estate_details.rental_status, 'rented', 'Property rental_status is rented');

        // 4. Base Calculation
        const baseCalc = calculateSettlement({
          monthlyRent: activeLease.monthly_rent,
          adminFee: activeLease.admin_fee,
          adminPaidBy: activeLease.admin_paid_by,
          commissionPercentage: activeLease.commission_percentage,
          vatOnCommission: activeLease.vat_on_commission,
          deductions: [],
        });
        assertEqual(baseCalc.netOwnerPayout, 2807280, 'Base net owner payout is $2,807,280 COP');

        // 5. Monthly Settlement
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

        // 6. Maintenance Deduction ($180,000 COP)
        const deduction = deductionItemSchema.parse({
          concept: 'Reparación tubería baño principal',
          amount: 180000,
          category: 'maintenance',
        });
        monthlySettlement.deductions.push(deduction as SettlementDeduction);

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
        assertEqual(monthlySettlement.net_owner_payout, 2627280, 'Net payout recalculated to $2,627,280 COP');

        // 7. Tenant PSE Payment
        monthlySettlement.tenant_payment_status = 'paid';
        monthlySettlement.tenant_paid_at = '2026-09-04T10:30:00Z';

        // 8. Owner Payout Disbursement
        monthlySettlement.owner_payout_status = 'paid';
        monthlySettlement.owner_paid_at = '2026-09-09T14:15:00Z';
        monthlySettlement.statement_pdf_url = 'https://praxis.pixy.app/statements/liq-202609-helena-vergel.pdf';

        // 9. WhatsApp Landlord Link
        const landlordLink = generateOwnerPayoutWhatsAppLink({
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
          statementPdfUrl: monthlySettlement.statement_pdf_url,
          agencyName: 'Praxis Inmobiliaria',
        });
        assertTrue(landlordLink.includes('wa.me/573124445678'), 'WhatsApp link generated');

        // 10. Lease Termination
        activeLease.status = 'terminated';
        property.real_estate_details.rental_status = 'available';
        assertEqual(property.real_estate_details.rental_status, 'available', 'Property available again');
      },
    },

    // =========================================================================
    // SCENARIO 4.2: Full Praxis Inmobiliaria 12-Month Multi-Unit Portfolio Simulation
    // =========================================================================
    {
      name: '4.2 Praxis Inmobiliaria 12-Month Multi-Unit Portfolio Simulation (48 Periods across 4 Properties in Ibagué)',
      fn: async () => {
        const store = initPraxisStore();
        const periods = [
          '2026-09', '2026-10', '2026-11', '2026-12',
          '2027-01', '2027-02', '2027-03', '2027-04',
          '2027-05', '2027-06', '2027-07', '2027-08',
        ];

        // Portfolio Leases Configuration (4 Properties in Ibagué)
        interface SimulatedLeaseConfig {
          propertyId: string;
          name: string;
          baseRent: number;
          adminFee: number;
          adminPaidBy: AdminPaidBy;
          tenantName: string;
          ownerName: string;
          bankName: string;
        }

        const portfolioConfigs: SimulatedLeaseConfig[] = [
          {
            propertyId: PRAXIS_PROPERTY_ID,
            name: 'Apartamento El Vergel',
            baseRent: 3600000,
            adminFee: 450000,
            adminPaidBy: 'agency',
            tenantName: 'Carlos Andrés Mendoza',
            ownerName: 'Dra. Helena Barreto Lozano',
            bankName: 'Bancolombia',
          },
          {
            propertyId: 'prop-calambeo-uuid',
            name: 'Casa Campestre Calambeo',
            baseRent: 5200000,
            adminFee: 600000,
            adminPaidBy: 'agency',
            tenantName: 'Dr. Santiago Valencia',
            ownerName: 'Ing. Roberto Durán',
            bankName: 'Davivienda',
          },
          {
            propertyId: 'prop-piedra-pintada-uuid',
            name: 'Local Comercial Piedra Pintada',
            baseRent: 4800000,
            adminFee: 550000,
            adminPaidBy: 'tenant', // Tenant pays admin directly to commercial center
            tenantName: 'Café Tolima Gourmet S.A.S.',
            ownerName: 'Doña Beatriz Morales',
            bankName: 'BBVA Colombia',
          },
          {
            propertyId: 'prop-santa-ana-uuid',
            name: 'Apartaestudio Santa Ana',
            baseRent: 1800000,
            adminFee: 200000,
            adminPaidBy: 'agency',
            tenantName: 'Valentina Restrepo',
            ownerName: 'Dra. Helena Barreto Lozano',
            bankName: 'Bancolombia',
          },
        ];

        // Track Cumulative Accounting Totals
        let totalPortfolioGrossCollected = 0;
        let totalPortfolioCommission = 0;
        let totalPortfolioVAT = 0;
        let totalPortfolioDeductions = 0;
        let totalPortfolioNetOwnerPayouts = 0;
        let totalStatementsGenerated = 0;

        for (let monthIdx = 0; monthIdx < periods.length; monthIdx++) {
          const period = periods[monthIdx];

          for (const config of portfolioConfigs) {
            let activeRent = config.baseRent;
            const deductions: SettlementDeduction[] = [];

            // Event 1 (Month 2 / 2026-10): Plumbing repair on El Vergel
            if (period === '2026-10' && config.propertyId === PRAXIS_PROPERTY_ID) {
              deductions.push({
                id: `ded-plumbing-${period}`,
                concept: 'Mantenimiento plomería calentador',
                amount: 180000,
                category: 'maintenance',
                date: `${period}-08`,
              });
            }

            // Event 2 (Month 3 / 2026-11): Mid-month move-in on Santa Ana (15 days proration)
            if (period === '2026-11' && config.propertyId === 'prop-santa-ana-uuid') {
              activeRent = 900000; // 15 days of 1.8M
            }

            // Event 3 (Month 4 / 2026-12): Painting repair on Calambeo House
            if (period === '2026-12' && config.propertyId === 'prop-calambeo-uuid') {
              deductions.push({
                id: `ded-paint-${period}`,
                concept: 'Retoque pintura fachada exterior',
                amount: 250000,
                category: 'repair',
                date: `${period}-12`,
              });
            }

            // Calculate Statement
            const calc = calculateSettlement({
              monthlyRent: activeRent,
              adminFee: config.adminFee,
              adminPaidBy: config.adminPaidBy,
              commissionPercentage: 8.0,
              vatOnCommission: true,
              deductions,
            });

            // Accounting verification per statement
            const expectedGross = config.adminPaidBy === 'agency'
              ? roundCurrency(activeRent + config.adminFee)
              : activeRent;
            const expectedCommission = roundCurrency(activeRent * 0.08);
            const expectedVAT = roundCurrency(expectedCommission * 0.19);
            const adminDeduction = config.adminPaidBy === 'agency' ? config.adminFee : 0;
            const deductionsSum = deductions.reduce((s, d) => s + d.amount, 0);
            const expectedNet = roundCurrency(
              Math.max(0, activeRent - expectedCommission - expectedVAT - adminDeduction - deductionsSum)
            );

            assertEqual(calc.grossCollected, expectedGross, `Gross matches for ${config.name} in ${period}`);
            assertEqual(calc.commissionAmount, expectedCommission, `Commission matches for ${config.name} in ${period}`);
            assertEqual(calc.vatAmount, expectedVAT, `VAT matches for ${config.name} in ${period}`);
            assertEqual(calc.netOwnerPayout, expectedNet, `Net payout matches for ${config.name} in ${period}`);

            // Accumulate
            totalPortfolioGrossCollected = roundCurrency(totalPortfolioGrossCollected + calc.grossCollected);
            totalPortfolioCommission = roundCurrency(totalPortfolioCommission + calc.commissionAmount);
            totalPortfolioVAT = roundCurrency(totalPortfolioVAT + calc.vatAmount);
            totalPortfolioDeductions = roundCurrency(totalPortfolioDeductions + calc.deductionsAmount);
            totalPortfolioNetOwnerPayouts = roundCurrency(totalPortfolioNetOwnerPayouts + calc.netOwnerPayout);
            totalStatementsGenerated++;
          }
        }

        // Global Verifications across 48 periods
        assertEqual(totalStatementsGenerated, 48, 'Exactly 48 settlement statements generated (4 properties × 12 months)');
        assertTrue(totalPortfolioGrossCollected > 0, 'Portfolio gross collected > 0');
        assertTrue(totalPortfolioCommission > 0, 'Portfolio commission > 0');
        assertTrue(totalPortfolioVAT > 0, 'Portfolio VAT > 0');
        assertEqual(totalPortfolioDeductions, 430000, 'Total deductions across 12 months = 180,000 + 250,000 = 430,000 COP');
        assertTrue(totalPortfolioNetOwnerPayouts > 0, 'Total net owner payouts > 0');
      },
    },

    // =========================================================================
    // SCENARIO 4.3: Insured Default Claim & Siniestro Aseguradora Workflow
    // =========================================================================
    {
      name: '4.3 Insured Default Claim: Tenant defaults, claim indemnified by Seguros Bolívar, and landlord paid on schedule',
      fn: async () => {
        const store = initPraxisStore();
        const monthlyRent = 3600000;
        const adminFee = 450000;

        // 1. Lease backed by Seguros Bolívar
        const lease: PropertyLease = {
          id: PRAXIS_LEASE_ID,
          organization_id: PRAXIS_ORG_ID,
          property_id: PRAXIS_PROPERTY_ID,
          tenant_id: PRAXIS_TENANT_ID,
          owner_id: PRAXIS_OWNER_ID,
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
          },
          created_at: '2026-08-20T00:00:00Z',
          updated_at: '2026-08-20T00:00:00Z',
        };
        store.leases.set(lease.id, lease);

        // 2. Billing Period 2026-12: Tenant defaults
        const baseCalc = calculateSettlement({
          monthlyRent,
          adminFee,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
        });

        const settlement: PropertyLeaseSettlement = {
          id: PRAXIS_SETTLEMENT_ID,
          organization_id: PRAXIS_ORG_ID,
          lease_id: lease.id,
          period: '2026-12',
          receipt_number: 'LIQ-202612-SIN01',
          rent_amount: baseCalc.rentAmount,
          admin_fee_amount: baseCalc.adminFeeAmount,
          gross_collected: baseCalc.grossCollected,
          commission_amount: baseCalc.commissionAmount,
          vat_amount: baseCalc.vatAmount,
          deductions_amount: 0,
          net_owner_payout: baseCalc.netOwnerPayout,
          tenant_payment_status: 'late', // Day 6: Past due
          owner_payout_status: 'pending',
          deductions: [],
          created_at: '2026-12-01T08:00:00Z',
          updated_at: '2026-12-06T08:00:00Z',
        };
        store.settlements.set(settlement.id, settlement);

        // Day 16: Claim filed with Seguros Bolívar
        const insuranceClaim = {
          policy_number: 'BOL-ARR-2026-8841',
          insured_amount: monthlyRent,
          claim_status: 'approved',
          indemnity_reference: 'IND-BOL-2026-9921',
          indemnity_paid_at: '2026-12-18T11:00:00Z',
        };
        assertEqual(insuranceClaim.insured_amount, 3600000, 'Insurer indemnifies 100% of canon ($3,600,000)');

        // Log indemnity collection from Seguros Bolívar
        settlement.tenant_payment_status = 'paid';
        settlement.tenant_paid_at = insuranceClaim.indemnity_paid_at;
        settlement.notes = `Canon indemnizado por Seguros Bolívar bajo póliza ${insuranceClaim.policy_number}. Ref: ${insuranceClaim.indemnity_reference}.`;

        // Owner payout executed cleanly to Bancolombia
        settlement.owner_payout_status = 'paid';
        settlement.owner_paid_at = '2026-12-19T14:00:00Z';
        settlement.statement_pdf_url = 'https://praxis.pixy.app/statements/liq-202612-helena-siniestro.pdf';

        assertEqual(settlement.net_owner_payout, 2807280, 'Landlord receives full protected payout ($2,807,280 COP)');
        assertEqual(settlement.owner_payout_status, 'paid', 'Owner payout executed successfully');
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
