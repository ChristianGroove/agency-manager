# Project: Pixy RentFlow Pro (module_rentals)

## Architecture
RentFlow Pro is a high-performance Property Management and Rent Settlement module designed for Pixy's Real Estate Space (`real_estate`). It operates within Pixy's multi-tenant Next.js / Supabase architecture, providing a complete rental contract lifecycle, automated monthly billing, collection semáforo with 1-click WhatsApp payment reminders, maintenance deduction management, and landlord payout settlement calculations with 100% CRM integrity.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 Next.js SSR App Router                 │
                  │              /rentals (IAM & Space Check)              │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           RentalsWorkspace (React / Tailwind UI)                                 │
│  ├── KPI Header (Active Leases, Expected Revenue, Delinquency Sum, Pending Payouts)               │
│  ├── Tab 1: Contratos Activos (Card/List, Status badges, LeaseFormSheet drawer)                   │
│  ├── Tab 2: Control de Cobranza (Semáforo, 1-Click WhatsApp PSE/Wompi, Payment Logging)          │
│  └── Tab 3: Liquidaciones a Propietarios (Ledger, Deduction Inspector, SettlementModal, Payouts) │
└─────────────────────────────────────────────┬─────────────────────────────────────────────────────┘
                                              │ Server Actions / Services
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                            Rentals Domain Engine & Services                                       │
│  ├── settlement-calculator.ts (Gross, 8% Commission, 19% VAT, Admin Fees, Deductions, Net Payout)│
│  ├── leases.ts (Create, Update, Terminate, Query with property/tenant/owner joins)               │
│  ├── settlements.ts (Generate Monthly Settlements, Record Payment, Record Payout, Deductions)    │
│  └── whatsapp-notifier.ts (Normalized phone formatting, PSE payment links, Payout extract links) │
└─────────────────────────────────────────────┬─────────────────────────────────────────────────────┘
                                              │ Supabase Client / SQL Migrations
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                PostgreSQL & Supabase Database                                     │
│  ├── property_leases (Multi-tenant contract registry, links service_catalog & leads)              │
│  ├── property_lease_settlements (Monthly financial ledger, deductions JSONB, status tracking)    │
│  └── RLS Policies (Strict organization_id tenant boundary isolation)                             │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database Migration & Tables | `property_leases`, `property_lease_settlements`, indexes, updated_at triggers, RLS policies | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Pure Mathematical Engine | `settlement-calculator.ts`: Gross, 8% Commission, 19% VAT on commission, Admin fee logic, Deductions, Net Payout | M2 | ORIGINAL_REQUEST §R2 |
| 3 | Lease Management Server Actions | `leases.ts`: `createLeaseAction`, `updateLeaseAction`, `terminateLeaseAction`, `getLeasesAction`, `getLeaseByIdAction` | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Monthly Settlement Server Actions | `settlements.ts`: `generateMonthlySettlementsAction`, `recordTenantPaymentAction`, `recordOwnerPayoutAction`, `addDeductionAction`, `getSettlementsAction` | M2 | ORIGINAL_REQUEST §R2 |
| 5 | WhatsApp Notification Engine | `whatsapp-notifier.ts`: Tenant payment reminder links with PSE/Wompi, Landlord payout settlement extract links | M2 | ORIGINAL_REQUEST §R2 |
| 6 | SSR Page & IAM Protection | `src/app/(dashboard)/rentals/page.tsx` with session check, `requireOrgRole("member")`, and `real_estate` space gate | M3 | ORIGINAL_REQUEST §R3 |
| 7 | Reactive Rentals Workspace | `rentals-workspace.tsx` with KPI Header and 3 interactive tabs (Contratos, Cobranzas, Liquidaciones) | M3 | ORIGINAL_REQUEST §R3 |
| 8 | Interactive Forms & Modals | `LeaseFormSheet` (multi-step lease creator) and `SettlementModal` (deduction inspector & payout manager) | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Sidebar & Space Navigation | Register `module_rentals` in `module-config.ts`, `capabilities-registry.ts`, `sidebar.tsx` with `KeyRound` icon | M4 | ORIGINAL_REQUEST §R4 |
| 10 | Praxis Inmobiliaria Seeding | `seed-praxis-rentals.ts`: 5 contacts in `leads`, 4 active leases in Ibagué, monthly settlements across diverse statuses | M5 | ORIGINAL_REQUEST §R5 |
| 11 | Automated E2E Test Suite | Expand `tests/e2e/catalog/runner.ts` with Math, RLS, Lifecycle, Non-interference tests & guarantee 0 `tsc --noEmit` errors | M6 | ORIGINAL_REQUEST §R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema & Multi-Tenant Isolation | SQL Migration `20260823000000_property_leases_and_settlements.sql`, RLS policies, indexes, system_modules registration | none | DONE |
| M2 | Core Mathematical Engine & Server Actions | `settlement-calculator.ts`, `leases.ts`, `settlements.ts`, `whatsapp-notifier.ts`, `rentals.types.ts`, `rentals.schema.ts` | M1 | DONE |
| M3 | Admin Workspace & Reactive UI (/rentals) | `src/app/(dashboard)/rentals/page.tsx`, `rentals-workspace.tsx`, `LeaseFormSheet`, `SettlementModal`, KPI cards | M2 | DONE |
| M4 | Sidebar & Space System Integration | `src/modules/core/saas/module-config.ts`, `capabilities-registry.ts`, `sidebar.tsx`, i18n dictionaries | M3 | DONE |
| M5 | Realistic Seeding for Praxis Inmobiliaria | `src/scripts/seed-praxis-rentals.ts` with 5 contacts, 4 active leases, monthly settlements | M1, M2 | DONE |
| M6 | Comprehensive Automated E2E Test Suite & Zero Regressions | `tests/e2e/catalog/runner.ts` expansion (Tier 1-4 tests for RentFlow Pro), 0 `tsc --noEmit` errors | M1, M2, M3, M4, M5 | IN_PROGRESS |

## Interface Contracts
### `settlement-calculator.ts`
```typescript
export interface CalculationInput {
    monthlyRent: number;
    adminFee: number;
    adminPaidBy: 'agency' | 'tenant';
    commissionPercentage: number;
    vatOnCommission: boolean;
    deductions?: Array<{ amount: number }>;
}

export interface CalculationResult {
    rentAmount: number;
    adminFeeAmount: number;
    grossCollected: number;
    commissionAmount: number;
    vatAmount: number;
    totalAgencyFee: number;
    deductionsAmount: number;
    netOwnerPayout: number;
}

export function calculateSettlement(input: CalculationInput): CalculationResult;
export function formatCOP(amount: number): string;
```

### `leases.ts` (Server Actions)
```typescript
export async function createLeaseAction(input: CreateLeaseInput): Promise<ActionResponse<PropertyLease>>;
export async function updateLeaseAction(id: string, updates: Partial<CreateLeaseInput>): Promise<ActionResponse<PropertyLease>>;
export async function terminateLeaseAction(id: string, notes?: string): Promise<ActionResponse<PropertyLease>>;
export async function getLeasesAction(filters?: { status?: LeaseStatus; propertyId?: string }): Promise<ActionResponse<PropertyLease[]>>;
export async function getLeaseByIdAction(id: string): Promise<ActionResponse<PropertyLease | null>>;
```

### `settlements.ts` (Server Actions)
```typescript
export async function generateMonthlySettlementsAction(period: string, leaseIds?: string[]): Promise<ActionResponse<PropertyLeaseSettlement[]>>;
export async function recordTenantPaymentAction(input: RecordTenantPaymentInput): Promise<ActionResponse<PropertyLeaseSettlement>>;
export async function recordOwnerPayoutAction(input: RecordOwnerPayoutInput): Promise<ActionResponse<PropertyLeaseSettlement>>;
export async function addDeductionAction(settlementId: string, deduction: DeductionInput): Promise<ActionResponse<PropertyLeaseSettlement>>;
export async function getSettlementsAction(filters?: { period?: string; tenantStatus?: string; ownerStatus?: string }): Promise<ActionResponse<PropertyLeaseSettlement[]>>;
```

### `whatsapp-notifier.ts`
```typescript
export function generateTenantPaymentWhatsAppLink(params: TenantPaymentReminderParams): string;
export function generateOwnerPayoutWhatsAppLink(params: OwnerPayoutNotificationParams): string;
```

## Code Layout
```
supabase/migrations/
└── 20260823000000_property_leases_and_settlements.sql

src/
├── app/(dashboard)/
│   └── rentals/
│       └── page.tsx
├── components/layout/
│   └── sidebar.tsx
├── modules/
│   ├── core/
│   │   ├── i18n/dictionaries/
│   │   │   ├── es.ts
│   │   │   └── en.ts
│   │   ├── organizations/
│   │   │   └── capabilities-registry.ts
│   │   └── saas/
│   │       └── module-config.ts
│   └── features/
│       └── rentals/
│           ├── actions/
│           │   ├── leases.ts
│           │   └── settlements.ts
│           ├── components/
│           │   ├── rentals-workspace.tsx
│           │   ├── lease-form-sheet.tsx
│           │   ├── settlement-modal.tsx
│           │   ├── leases-tab.tsx
│           │   ├── collections-tab.tsx
│           │   ├── settlements-tab.tsx
│           │   └── rentals-kpis.tsx
│           ├── schemas/
│           │   └── rentals.schema.ts
│           ├── services/
│           │   ├── settlement-calculator.ts
│           │   ├── rentals-service.ts
│           │   └── whatsapp-notifier.ts
│           └── types/
│               └── rentals.types.ts
├── scripts/
│   └── seed-praxis-rentals.ts
└── types/
    └── rentals.ts

tests/e2e/catalog/
├── tier1-features/
│   └── t1-28-rentflow-pro-engine.test.ts
├── tier2-boundaries/
│   └── t2-28-rentflow-calculations-boundaries.test.ts
├── tier3-pairwise/
│   └── t3-11-rentals-real-estate-integration.test.ts
└── tier4-scenarios/
    └── t4-14-praxis-rentals-lifecycle-scenario.test.ts
```
