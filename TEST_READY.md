# TEST READY: RentFlow Pro & Real Estate E2E Test Matrix Expansion (Milestone 3 / Track B)

**Date**: 2026-08-23  
**Status**: Ready for Verification & Tier 5 Adversarial Audit  
**Target Space**: `real_estate` (RentFlow Pro / `module_rentals`)  
**Target Organization Benchmark**: Praxis Inmobiliaria (`c41dcf16-f94d-499d-a1f8-bc9027206495` — Ibagué, Tolima)  

---

## 1. Test Execution Commands

To execute the automated end-to-end test suite and type check:

```powershell
# Run full E2E Test Runner across all 5 Tiers
npx tsx tests/e2e/catalog/runner.ts

# Run static type checking verification
npx tsc --noEmit
```

---

## 2. Test Suite Inventory & Coverage Matrix

| Tier | Suite Identifier | File Path | Tests | Coverage Scope |
| :--- | :--- | :--- | :---: | :--- |
| **Tier 1** | `T1-28: RentFlow Pro Mathematical Engine, Schemas & WhatsApp Generator` | `tests/e2e/catalog/tier1-features/t1-28-rentflow-pro-engine.test.ts` | 13 | Colombian residential lease math (8% + 19% IVA), admin fee handling (agency vs tenant), float cent precision, non-negative net payout clamping, `formatCOP`, WhatsApp tenant & owner link generators, Zod schemas (`createLeaseSchema`, `bankPayoutDetailsSchema`, `deductionItemSchema`), co-signer attachment (`co_signer_id`), guarantee type enumeration (`direct`, `insurance`, `bond`, `deposit`, `promissory_note`), Colombian bank account schemas, and sequential receipt numbering (`LIQ-YYYYMM-XXXX`). |
| **Tier 2** | `T2-28: RentFlow Pro Mathematical Engine Extreme Boundaries & Edge Cases` | `tests/e2e/catalog/tier2-boundaries/t2-28-rentflow-calculations-boundaries.test.ts` | 20 | `calculateProratedRent` (mid-month start, 1-day start, 30-day full month), calendar day clamps (Feb 28, Feb 29 leap year, 30/31 days), 100% deduction saturation with zero payout clamping, unrecovered deficit balance tracking, Colombian tax matrix (residential exempt, 19% commercial rent IVA + 19% commission IVA, retefuente 3.5%, simplified non-VAT regime), zero/neutral inputs, high-precision float rounding, multi-deduction arrays (100 items), malformed item sanitization, negative inputs, `roundCurrency`, `formatCOP`, and `normalizePhone` edge cases. |
| **Tier 3** | `T3-11: RentFlow Pro Real Estate Cross-Feature Integration Suite` | `tests/e2e/catalog/tier3-pairwise/t3-11-rentals-real-estate-integration.test.ts` | 7 | Catalog property linking & rental status sync (`available` <-> `rented`), multi-tenant RLS isolation between Org A (Ibagué) and Org B (Bogotá), multi-month settlement roll-forward with unpaid balances, multi-contractor deduction matrices with split invoices, mid-cycle lease termination with security deposit reconciliation, Law 820 IPC statutory indexation (5.62%), and cross-space isolation invariants across `agency`, `resto`, `cleaning`, `retail`, `saas`, and `platform`. |
| **Tier 4** | `T4-14: Praxis Inmobiliaria Complete Rentals & Payouts Lifecycle Scenario` | `tests/e2e/catalog/tier4-scenarios/t4-14-praxis-rentals-lifecycle-scenario.test.ts` | 3 | **Scenario 1**: 10-step full lifecycle for El Vergel Apartment (Onboarding -> Lease Creation -> Status Sync -> Monthly Settlement -> WhatsApp Reminder -> Plumbing Deduction -> PSE Payment -> Bancolombia Payout -> Landlord Statement -> Termination).<br>**Scenario 2**: 12-Month Multi-Unit Portfolio Simulation (48 periods across 4 properties in Ibagué: El Vergel, Calambeo, Piedra Pintada, Santa Ana) with mid-month proration, maintenance deductions, and global accounting reconciliation.<br>**Scenario 3**: Insured Default Claim & Siniestro Aseguradora Workflow with Seguros Bolívar. |

---

## 3. Mathematical & Accounting Guarantees

1. **Cent-Precision Calculation Engine**:
   - `Gross Collected` = `Rent` + (`Admin Fee` if agency collected).
   - `Agency Commission` = `Rent` × 8.00%.
   - `VAT on Commission` = `Agency Commission` × 19% IVA.
   - `Total Agency Fee` = `Agency Commission` + `VAT` (effective 9.52% on rent).
   - `Net Owner Payout` = `Rent` - `Commission` - `VAT` - (`Admin Fee` if agency paid) - `Deductions` (clamped to ≥ $0.00).
2. **Prorated Rent Accounting (Law 820 of 2003 / 30-Day Financial Month)**:
   - `Prorated Rent` = `roundCurrency((Monthly Rent / 30) * (30 - Start Day + 1))`.
3. **Multi-Tenant RLS & Zero Cross-Space Pollution**:
   - `module_rentals` and `/rentals` are strictly isolated to `real_estate` organizations.
   - Core tables (`public.leads`, `public.service_catalog`, `public.invoices`) remain 100% untouched structurally.
