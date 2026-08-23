/**
 * Tier 1 Test Suite: F28 - RentFlow Pro Pure Mathematical Engine & Financial Validation
 * Suite: t1-28-rentflow-pro-engine
 * Feature: Real Estate Lease Settlements, Colombian Statutory Tax (IVA 19%), Cent Precision, Schemas, Co-Signer & WhatsApp Links
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
  assertContains,
  assertThrows,
  assertMatches,
  TestRegistry,
  TestSuiteResult,
} from '../harness/assertions';
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
  createLeaseSchema,
  updateLeaseSchema,
  bankPayoutDetailsSchema,
  guaranteeDetailsSchema,
  deductionItemSchema,
  recordTenantPaymentSchema,
  recordOwnerPayoutSchema,
  addDeductionSchema,
} from '../../../../src/modules/features/rentals/schemas/rentals.schema';
import type { GuaranteeType, LeaseStatus } from '../../../../src/types/rentals';

/**
 * Receipt Number Generator Helper: Produces sequential references `LIQ-YYYYMM-XXXX`
 */
export function generateReceiptNumber(period: string, sequenceNumber: number): string {
  const cleanPeriod = period.replace('-', '');
  const paddedSeq = String(sequenceNumber).padStart(4, '0');
  return `LIQ-${cleanPeriod}-${paddedSeq}`;
}

export const suite = {
  name: 'T1-28: RentFlow Pro Mathematical Engine, Schemas & WhatsApp Generator',
  tier: 'Tier 1',
  feature: 'F28: RentFlow Pro Mathematical Engine & Actions',
  tests: [
    {
      name: '1. Standard Colombian Lease Calculation (Agency Admin + 8% Commission + 19% IVA + Deductions)',
      fn: () => {
        // Canon: $2,500,000 COP, Admin: $300,000 (agency), Commission: 8%, VAT: true, Deduction: $150,000
        const result = calculateSettlement({
          monthlyRent: 2500000,
          adminFee: 300000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [{ amount: 150000 }],
        });

        // 1. Gross = Rent + Admin = 2,500,000 + 300,000 = 2,800,000
        assertEqual(result.grossCollected, 2800000, 'Gross collected must include admin when paid by agency');
        assertEqual(result.rentAmount, 2500000, 'Rent amount matches base');
        assertEqual(result.adminFeeAmount, 300000, 'Admin fee matches input');

        // 2. Commission = 2,500,000 * 0.08 = 200,000
        assertEqual(result.commissionAmount, 200000, 'Commission must be 8% of rent ($200,000)');

        // 3. VAT on Commission = 200,000 * 0.19 = 38,000
        assertEqual(result.vatAmount, 38000, 'VAT must be 19% of commission ($38,000)');
        assertEqual(result.totalAgencyFee, 238000, 'Total agency fee = Commission + VAT = 238,000');

        // 4. Deductions = 150,000
        assertEqual(result.deductionsAmount, 150000, 'Deductions must equal 150,000');

        // 5. Net Owner Payout = 2,500,000 - 200,000 - 38,000 - 300,000 - 150,000 = 1,812,000
        assertEqual(result.netOwnerPayout, 1812000, 'Net owner payout must be exactly $1,812,000 COP');
      },
    },
    {
      name: '2. Tenant Paid Admin Calculation (Direct Condominium Payment)',
      fn: () => {
        // Canon: $1,800,000 COP, Admin: $200,000 (tenant pays directly), Commission: 8%, VAT: true, Deductions: 0
        const result = calculateSettlement({
          monthlyRent: 1800000,
          adminFee: 200000,
          adminPaidBy: 'tenant',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [],
        });

        // 1. Gross = Rent = 1,800,000 (Admin not collected by agency)
        assertEqual(result.grossCollected, 1800000, 'Gross collected is only rent when tenant pays admin');

        // 2. Commission = 1,800,000 * 0.08 = 144,000
        assertEqual(result.commissionAmount, 144000, 'Commission is $144,000');

        // 3. VAT = 144,000 * 0.19 = 27,360
        assertEqual(result.vatAmount, 27360, 'VAT on commission is $27,360');

        // 4. Net Owner Payout = 1,800,000 - 144,000 - 27,360 = 1,628,640
        assertEqual(result.netOwnerPayout, 1628640, 'Net owner payout is $1,628,640 COP');
      },
    },
    {
      name: '3. Tax Exemption (VAT on Commission = false) & Custom Commission Rates',
      fn: () => {
        const result = calculateSettlement({
          monthlyRent: 3000000,
          adminFee: 0,
          adminPaidBy: 'tenant',
          commissionPercentage: 10.0,
          vatOnCommission: false,
        });

        assertEqual(result.commissionAmount, 300000, 'Commission is 10% ($300,000)');
        assertEqual(result.vatAmount, 0, 'VAT must be 0 when vatOnCommission is false');
        assertEqual(result.totalAgencyFee, 300000, 'Total agency fee = Commission ($300,000)');
        assertEqual(result.netOwnerPayout, 2700000, 'Net owner payout = 3,000,000 - 300,000 = 2,700,000');
      },
    },
    {
      name: '4. Floating-Point Precision & Rounding Verification (Cent Precision)',
      fn: () => {
        const result = calculateSettlement({
          monthlyRent: 1234567.89,
          adminFee: 123.45,
          adminPaidBy: 'agency',
          commissionPercentage: 8.5,
          vatOnCommission: true,
          deductions: [{ amount: 50.12 }, { amount: 25.34 }],
        });

        // Commission = 1234567.89 * 0.085 = 104938.27065 -> 104938.27
        assertEqual(result.commissionAmount, 104938.27, 'Commission cent rounding verified');

        // VAT = 104938.27 * 0.19 = 19938.2713 -> 19938.27
        assertEqual(result.vatAmount, 19938.27, 'VAT cent rounding verified');

        // Deductions = 50.12 + 25.34 = 75.46
        assertEqual(result.deductionsAmount, 75.46, 'Deductions sum verified');

        // Net = 1234567.89 - 104938.27 - 19938.27 - 123.45 - 75.46 = 1109492.44
        assertEqual(result.netOwnerPayout, 1109492.44, 'Net owner payout cent rounding verified');
      },
    },
    {
      name: '5. Non-Negative Clamping for Net Owner Payout (Extreme Deductions)',
      fn: () => {
        const result = calculateSettlement({
          monthlyRent: 1000000,
          adminFee: 200000,
          adminPaidBy: 'agency',
          commissionPercentage: 8.0,
          vatOnCommission: true,
          deductions: [{ amount: 2000000 }], // Deductions exceed rent
        });

        assertEqual(result.netOwnerPayout, 0, 'Net owner payout must be clamped to minimum 0');
      },
    },
    {
      name: '6. Colombian Currency Formatter (formatCOP)',
      fn: () => {
        const formatted1 = formatCOP(2500000);
        assertTrue(formatted1.includes('2.500.000'), 'Formats 2.5M COP with dots');
        assertTrue(formatted1.includes('$'), 'Contains currency symbol');

        const formatted0 = formatCOP(0);
        assertTrue(formatted0.includes('0'), 'Formats 0 COP correctly');
      },
    },
    {
      name: '7. WhatsApp Tenant Payment Reminder Link Generator',
      fn: () => {
        const link = generateTenantPaymentWhatsAppLink({
          tenantName: 'Carlos Gómez',
          tenantPhone: '+57 300 123 4567',
          propertyTitle: 'Apt 502 Edificio Mirador del Vergel',
          period: 'Septiembre 2026',
          monthlyRent: 2200000,
          adminFee: 250000,
          adminPaidBy: 'agency',
          paymentDay: 5,
          paymentLink: 'https://pixy.app/p/pay-12345',
          agencyName: 'Praxis Inmobiliaria',
        });

        assertTrue(link.startsWith('https://wa.me/573001234567?text='), 'Phone normalized to 573001234567');
        const decoded = decodeURIComponent(link.split('?text=')[1]);
        assertContains(decoded, 'Carlos Gómez', 'Contains tenant name');
        assertContains(decoded, 'Apt 502 Edificio Mirador del Vergel', 'Contains property title');
        assertContains(decoded, 'Praxis Inmobiliaria', 'Contains agency name');
        assertContains(decoded, 'https://pixy.app/p/pay-12345', 'Contains PSE / payment link');
      },
    },
    {
      name: '8. WhatsApp Owner Payout Statement Link Generator',
      fn: () => {
        const link = generateOwnerPayoutWhatsAppLink({
          ownerName: 'Dra. Patricia Silva',
          ownerPhone: '315 987 6543',
          propertyTitle: 'Casa Campestre Calambeo',
          period: '2026-09',
          rentAmount: 3500000,
          commissionAmount: 280000,
          vatAmount: 53200,
          adminFeeAmount: 400000,
          adminPaidBy: 'agency',
          deductionsAmount: 120000,
          netOwnerPayout: 2646800,
          bankName: 'Bancolombia',
          accountNumber: 'Ahorros 245-098765-12',
          statementPdfUrl: 'https://pixy.app/statements/liq-202609-01.pdf',
          agencyName: 'Praxis Inmobiliaria',
        });

        assertTrue(link.startsWith('https://wa.me/573159876543?text='), 'Phone normalized to 573159876543');
        const decoded = decodeURIComponent(link.split('?text=')[1]);
        assertContains(decoded, 'Patricia Silva', 'Contains owner name');
        assertContains(decoded, 'Bancolombia', 'Contains destination bank');
        assertContains(decoded, '245-098765-12', 'Contains account number');
        assertContains(decoded, 'https://pixy.app/statements/liq-202609-01.pdf', 'Contains statement PDF URL');
      },
    },
    {
      name: '9. Zod Schemas Validation (createLeaseSchema, bankPayoutDetailsSchema, deductionItemSchema)',
      fn: () => {
        // Valid Bank Details
        const validBank = bankPayoutDetailsSchema.parse({
          bank: 'Bancolombia',
          account_type: 'savings',
          account_number: '123456789',
          account_holder: 'Juan Pérez',
          id_number: '1020304050',
          id_type: 'CC',
        });
        assertEqual(validBank.bank, 'Bancolombia', 'Bank parsed');

        // Valid Deduction
        const validDeduction = deductionItemSchema.parse({
          concept: 'Reparación motobomba piscina',
          amount: 85000,
          category: 'maintenance',
        });
        assertEqual(validDeduction.amount, 85000, 'Deduction parsed');
        assertDefined(validDeduction.id, 'Deduction generated ID');

        // Valid Lease
        const validLease = createLeaseSchema.parse({
          property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          monthly_rent: 1500000,
          admin_fee: 150000,
          admin_paid_by: 'agency',
          start_date: '2026-09-01',
          end_date: '2027-08-31',
          payment_day: 5,
          payout_day: 10,
          bank_payout_details: {
            bank: 'Davivienda',
            account_type: 'checking',
            account_number: '987654321',
            account_holder: 'María Rodríguez',
            id_number: '52345678',
            id_type: 'CC',
          },
        });
        assertEqual(validLease.commission_percentage, 8.0, 'Default commission percentage 8.0 applied');
        assertTrue(validLease.vat_on_commission, 'Default vat_on_commission true applied');
      },
    },
    {
      name: '10. Co-Signer Attachment Schema & Validation (co_signer_id linking CRM leads)',
      fn: () => {
        const coSignerUuid = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

        // 1. Valid lease with co-signer attached
        const leaseWithCoSigner = createLeaseSchema.parse({
          property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          co_signer_id: coSignerUuid,
          monthly_rent: 2800000,
          admin_fee: 320000,
          admin_paid_by: 'agency',
          start_date: '2026-09-01',
          end_date: '2027-08-31',
          bank_payout_details: {
            bank: 'Bancolombia',
            account_type: 'savings',
            account_number: '300-456789-01',
            account_holder: 'Alberto Gómez',
            id_number: '14.285.901',
            id_type: 'CC',
          },
        });
        assertEqual(leaseWithCoSigner.co_signer_id, coSignerUuid, 'co_signer_id successfully attached to lease');

        // 2. Valid lease with co-signer as null (optional)
        const leaseWithoutCoSigner = createLeaseSchema.parse({
          property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          co_signer_id: null,
          monthly_rent: 2800000,
          start_date: '2026-09-01',
          end_date: '2027-08-31',
          bank_payout_details: {
            bank: 'Bancolombia',
            account_type: 'savings',
            account_number: '300-456789-01',
            account_holder: 'Alberto Gómez',
            id_number: '14.285.901',
          },
        });
        assertEqual(leaseWithoutCoSigner.co_signer_id, null, 'co_signer_id allows null value');

        // 3. Invalid non-UUID co_signer_id rejected by schema
        assertThrows(() => {
          createLeaseSchema.parse({
            property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
            owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
            co_signer_id: 'not-a-valid-uuid',
            monthly_rent: 2800000,
            start_date: '2026-09-01',
            end_date: '2027-08-31',
            bank_payout_details: {
              bank: 'Bancolombia',
              account_type: 'savings',
              account_number: '300-456789-01',
              account_holder: 'Alberto Gómez',
              id_number: '14.285.901',
            },
          });
        }, 'Invalid UUID', 'Rejects malformed co_signer_id');
      },
    },
    {
      name: '11. Guarantee Type Enumeration Validation (direct, insurance, bond, deposit, promissory_note)',
      fn: () => {
        const guaranteeTypes: GuaranteeType[] = [
          'direct',
          'insurance',
          'bond',
          'deposit',
          'promissory_note',
        ];

        for (const gType of guaranteeTypes) {
          const parsed = createLeaseSchema.parse({
            property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
            owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
            monthly_rent: 2000000,
            start_date: '2026-09-01',
            end_date: '2027-08-31',
            guarantee_type: gType,
            guarantee_details: {
              provider: gType === 'insurance' ? 'Seguros Bolívar' : gType === 'bond' ? 'Fianzas de Colombia' : 'Direct Guarantee',
              policy_number: `POL-${gType.toUpperCase()}-2026`,
              coverage_percentage: 100,
            },
            bank_payout_details: {
              bank: 'BBVA Colombia',
              account_type: 'savings',
              account_number: '0013-123456',
              account_holder: 'Carlos Propietario',
              id_number: '79.123.456',
            },
          });

          assertEqual(parsed.guarantee_type, gType, `Guarantee type '${gType}' correctly accepted`);
          assertEqual(parsed.guarantee_details?.coverage_percentage, 100, 'Coverage percentage parsed');
        }

        // Invalid guarantee type rejected
        assertThrows(() => {
          createLeaseSchema.parse({
            property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
            owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
            monthly_rent: 2000000,
            start_date: '2026-09-01',
            end_date: '2027-08-31',
            guarantee_type: 'bitcoin_collateral' as any,
            bank_payout_details: {
              bank: 'BBVA',
              account_type: 'savings',
              account_number: '123',
              account_holder: 'Carlos',
              id_number: '79123',
            },
          });
        }, undefined, 'Invalid guarantee type throws error');
      },
    },
    {
      name: '12. Bank Payout Details Schema Validation (Colombian Banks, Account Types & ID Types)',
      fn: () => {
        // 1. Valid Colombian Banks and Formats
        const banks = ['Bancolombia', 'Davivienda', 'BBVA Colombia', 'Banco de Bogotá', 'Nequi', 'Daviplata', 'Scotiabank Colpatria'];
        const accountTypes = ['savings', 'checking', 'ahorros', 'corriente'] as const;
        const idTypes = ['CC', 'NIT', 'CE', 'PP', 'TI', 'PAS'] as const;

        for (const bank of banks) {
          const parsed = bankPayoutDetailsSchema.parse({
            bank,
            account_type: 'savings',
            account_number: '123-456789-00',
            account_holder: 'Inversiones Inmobiliarias S.A.S.',
            id_number: '901.234.567-8',
            id_type: 'NIT',
          });
          assertEqual(parsed.bank, bank, `Bank ${bank} parsed successfully`);
          assertEqual(parsed.id_type, 'NIT', 'ID type NIT parsed');
        }

        // 2. Reject missing bank name
        assertThrows(() => {
          bankPayoutDetailsSchema.parse({
            bank: '',
            account_type: 'savings',
            account_number: '123456789',
            account_holder: 'Juan Pérez',
            id_number: '10203040',
          });
        }, 'El banco es requerido', 'Rejects empty bank name');

        // 3. Reject short account number (< 3 characters)
        assertThrows(() => {
          bankPayoutDetailsSchema.parse({
            bank: 'Bancolombia',
            account_type: 'savings',
            account_number: '12',
            account_holder: 'Juan Pérez',
            id_number: '10203040',
          });
        }, 'Número de cuenta inválido', 'Rejects short account number');

        // 4. Reject short ID number (< 4 characters)
        assertThrows(() => {
          bankPayoutDetailsSchema.parse({
            bank: 'Bancolombia',
            account_type: 'savings',
            account_number: '123456789',
            account_holder: 'Juan Pérez',
            id_number: '12',
          });
        }, 'Documento de identidad requerido', 'Rejects short ID number');
      },
    },
    {
      name: '13. Receipt Numbering Formatting & Sequential Format Validation (LIQ-YYYYMM-XXXX)',
      fn: () => {
        // Format standard: LIQ-YYYYMM-XXXX
        const regex = /^LIQ-\d{6}-\d{4}$/;

        const receipt1 = generateReceiptNumber('2026-09', 1);
        assertEqual(receipt1, 'LIQ-202609-0001', 'First receipt of September 2026 formatted correctly');
        assertMatches(receipt1, regex, 'Receipt 1 matches LIQ-YYYYMM-XXXX pattern');

        const receipt42 = generateReceiptNumber('2026-10', 42);
        assertEqual(receipt42, 'LIQ-202610-0042', 'Receipt 42 of October 2026 formatted correctly');
        assertMatches(receipt42, regex, 'Receipt 42 matches LIQ-YYYYMM-XXXX pattern');

        const receipt999 = generateReceiptNumber('2027-01', 999);
        assertEqual(receipt999, 'LIQ-202701-0999', 'Receipt 999 formatted correctly');
        assertMatches(receipt999, regex, 'Receipt 999 matches pattern');

        // Record payout schema accepts valid receipt number
        const payoutRecord = recordOwnerPayoutSchema.parse({
          settlement_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          paid_at: '2026-09-10T12:00:00Z',
          receipt_number: receipt1,
          statement_pdf_url: 'https://pixy.app/statements/liq-202609-0001.pdf',
        });
        assertEqual(payoutRecord.receipt_number, 'LIQ-202609-0001', 'Receipt number recorded in payout schema');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier1');
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
