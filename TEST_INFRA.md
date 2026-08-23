# E2E Test Infra: Pixy RentFlow Pro (module_rentals)

## Test Philosophy
- Requirement-driven, opaque-box testing for Pixy's RentFlow Pro module.
- Strict multi-tenant isolation, mathematical exactness down to the cent, Colombian real estate law compliance (Law 820 of 2003, 19% IVA on commission), and CRM integrity with zero schema alterations to core tables.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinations + Real-World Workload Scenarios.

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Feature) | Tier 2 (Boundaries) | Tier 3 (Pairwise) | Tier 4 (Real-World) |
|---|---------|-------------|:----------------:|:-------------------:|:-----------------:|:-------------------:|
| 1 | Mathematical Calculation Engine | ORIGINAL_REQUEST §R2 | ✓ (5 tests) | ✓ (6 tests) | ✓ | ✓ |
| 2 | WhatsApp Link Generation | ORIGINAL_REQUEST §R2 | ✓ (3 tests) | ✓ (3 tests) | ✓ | ✓ |
| 3 | Lease Data Model & Types | ORIGINAL_REQUEST §R1 | ✓ (4 tests) | ✓ (3 tests) | ✓ | ✓ |
| 4 | Monthly Settlement Lifecycle | ORIGINAL_REQUEST §R2 | ✓ (4 tests) | ✓ (4 tests) | ✓ | ✓ |
| 5 | Multi-Tenant RLS & CRM Integrity | ORIGINAL_REQUEST §R1 | ✓ (3 tests) | ✓ (3 tests) | ✓ | ✓ |
| 6 | Space Registry & Module Config | ORIGINAL_REQUEST §R4 | ✓ (3 tests) | ✓ (2 tests) | ✓ | ✓ |
| 7 | Praxis Inmobiliaria Seeding | ORIGINAL_REQUEST §R5 | ✓ (3 tests) | ✓ (2 tests) | ✓ | ✓ |

## Test Architecture
- **Runner**: `tests/e2e/catalog/runner.ts` (Executed via `npx tsx tests/e2e/catalog/runner.ts`)
- **Test Discovery**: Automatically discovers files in `tests/e2e/catalog/tier*`
- **Assertion Helpers**: `tests/e2e/catalog/harness/assertions.ts`
- **Output Format**: Structured console reporting with tier summaries, timing, and pass/fail counts.

## Test Suites to Add
1. **Tier 1 - Feature Coverage**: `tests/e2e/catalog/tier1-features/t1-28-rentflow-pro-engine.test.ts`
   - Test 1.1: Math calculation of Gross Collected with agency-paid admin fee
   - Test 1.2: Math calculation of 8% commission and 19% VAT on commission
   - Test 1.3: Math calculation of Net Owner Payout with maintenance deductions
   - Test 1.4: Tenant-paid admin fee leaves gross equal to rent
   - Test 1.5: Tenant WhatsApp reminder generates normalized phone and PSE link
   - Test 1.6: Owner payout WhatsApp message generates statement summary
   - Test 1.7: Lease status transitions and property rental_status synchronization
   - Test 1.8: Module configuration allows module_rentals exclusively for real_estate space

2. **Tier 2 - Boundary & Corner Cases**: `tests/e2e/catalog/tier2-boundaries/t2-28-rentflow-calculations-boundaries.test.ts`
   - Test 2.1: Zero rent and zero admin fee boundary calculation
   - Test 2.2: Zero commission rate (0%) and non-taxable commission (vat_on_commission = false)
   - Test 2.3: 100% commission extreme boundary
   - Test 2.4: Deductions exceeding monthly rent (net payout clamped to 0)
   - Test 2.5: Colombian Pesos currency rounding precision (cent precision with Math.round)
   - Test 2.6: Payment day boundaries (1st and 31st of month)
   - Test 2.7: Phone number normalization with varied Colombian prefixes (+57, 57, local 3xx)

3. **Tier 3 - Cross-Feature Combinations**: `tests/e2e/catalog/tier3-pairwise/t3-11-rentals-real-estate-integration.test.ts`
   - Test 3.1: Rental property in service_catalog linked to active lease in property_leases
   - Test 3.2: Multi-tenant organization isolation (Org A leases inaccessible to Org B)
   - Test 3.3: CRM Leads (tenant + owner) integration with lease contract without schema change
   - Test 3.4: Settlement creation with simultaneous maintenance deduction and payment recording

4. **Tier 4 - Real-World Application Scenario**: `tests/e2e/catalog/tier4-scenarios/t4-14-praxis-rentals-lifecycle-scenario.test.ts`
   - Test 4.1: Complete lifecycle for Praxis Inmobiliaria (Ibagué) from property catalog to active lease, monthly billing, delinquency semáforo, deduction processing, and landlord payout extract.

## Coverage Goals & Acceptance Criteria
- 100% tests passing in runner.
- 0 regressions in existing tiers (t1-01 to t1-27, t2, t3, t4, t5).
- 0 TypeScript compilation errors (`npx tsc --noEmit`).
