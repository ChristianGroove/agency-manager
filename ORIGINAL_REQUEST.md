# Original User Request

## Initial Request — 2026-08-22T21:09:00-05:00

Implement and integrate the new dedicated **Real Estate Space (`real_estate`)** into Pixy's multi-tenant architecture, Super Admin management, tenant onboarding & provisioning lifecycle, SaaS Engine operational module bundles, and default PropTech catalog & storefront presets.

Working directory: g:/Pixy/agency-manager
Integrity mode: development

## Requirements

### R1. Core Space Architecture & Registry (`real_estate`)
- Extend `SpaceCategory` in `src/modules/core/organizations/space-helpers.ts` and `src/types/saas.ts` to include `'real_estate'`.
- Register the full `DynamicSpaceConfig` preset for `real_estate` in `src/modules/core/organizations/capabilities-registry.ts`:
  - **Terminology**: `client: 'Cliente / Comprador'`, `clients: 'Clientes / Prospectos'`, `project: 'Inmueble / Propiedad'`, `sale: 'Cierre / Negocio'`, `action_new: 'Nuevo Prospecto'`.
  - **Policies**: Visible tabs (`['info', 'activity', 'services', 'billing']`), enabled channels (`['whatsapp', 'email', 'sms']`), default dashboard `real_estate`.
  - **Capabilities**: `['crm.core', 'crm.advanced', 'crm.quotes', 'messaging.standard', 'messaging.ai_agent', 'billing.management', 'automation.engine']`.
- Update module and route mappings in `src/modules/core/saas/module-config.ts` ensuring `/portfolio` (Propiedades & Inmuebles), `/crm/*`, and PropTech tools are accessible and properly categorized.

### R2. Super Admin & SaaS Engine Vertical App Provisioning
- Integrate `real_estate` into Super Admin Space management:
  - Add Real Estate option to `src/app/(dashboard)/platform/admin/apps/_components/create-app-dialog.tsx` and `src/modules/core/saas/create-app-sheet.tsx`.
  - Provide an idempotent seeding script/action registering `app_real_estate_pro` (*"Real Estate & PropTech Pro"*, slug `real-estate-pro`, category `real_estate`, icon `Building2`, price model, and linked system modules: `core_crm`, `core_clients`, `module_messaging`, `module_quotes`, `module_catalog`, `module_automation`, `core_locations`).
  - Verify `getAvailableApps`, `getSaaSProducts`, and `getAllAppsAdmin` correctly display the Real Estate Space in Super Admin galleries, usage stats, and Onboarding sliders (`AppSlider`).

### R3. Tenant Lifecycle & Automated PropTech Initialization
- In `src/modules/core/organizations/actions/provisioning.ts` (`createOrganization` / `createClientOrganization`):
  - When provisioning an organization under the Real Estate App or space category `real_estate`:
    - Automatically seed default Real Estate categories (*Apartamentos*, *Casas*, *Oficinas & Locales Comerciales*, *Lotes & Fincas*, *Proyectos Sobre Planos*).
    - Automatically initialize `portal_theme_config` with default `industry_preset: 'real_estate'` and mortgage calculator enabled.
    - Guarantee seamless module auto-enabling via `assign_app_to_organization`.

### R4. Workspace & Dashboard PropTech Adaptation
- In `src/modules/core/dashboard/dashboard-actions.ts`, recognize `spaceCategory === 'real_estate'` and adapt dashboard KPI widgets (Propiedades Activas, Leads de Compradores, Visitas / Contactos por Propiedades).
- In `src/modules/features/catalog/components/catalog-workspace.tsx` and `src/modules/features/catalog/components/catalog-items-tab.tsx`, display dynamic Real Estate terminology (*"Propiedades & Inmuebles"*, search placeholders for sector/city/barrio).

### R5. Comprehensive Automated E2E Test Suite & Zero Technical Debt
- Expand `tests/e2e/catalog/runner.ts` with dedicated automated test suites covering:
  - Space category resolution and capability registry lookup for `real_estate`.
  - Super Admin app configuration and module linking for Real Estate.
  - End-to-end tenant provisioning with Real Estate template, default categories, and preset initialization.
  - Multi-tenant isolation and 100% backwards compatibility with legacy spaces (`agency`, `resto`, `cleaning`, `retail`, `saas`).
- Ensure zero TypeScript errors (`tsc --noEmit`) and 100% test pass rate.

## Acceptance Criteria

### Space Architecture & Super Admin
- [ ] `SpaceCategory` includes `'real_estate'` across all TypeScript definitions and capability presets.
- [ ] Super Admin (`/platform/admin/apps`) can create, view, and edit Real Estate Spaces.
- [ ] The database has `app_real_estate_pro` properly registered with all required modules linked in `saas_app_modules`.

### Tenant Provisioning & Defaults
- [ ] Creating a new organization with the Real Estate template provisions all default categories (*Apartamentos*, *Casas*, etc.) and sets the default preset to `real_estate`.
- [ ] Navigating to `/portfolio` in a Real Estate tenant automatically displays the Real Estate interface and terminology without requiring manual configuration.
- [ ] Navigating to `/dashboard` in a Real Estate tenant renders the PropTech dashboard metrics.

### Quality, Security & Compatibility
- [ ] Zero cross-tenant data leakage and strict multi-tenant isolation enforced.
- [ ] Zero TypeScript compilation errors (`tsc --noEmit`).

## 2026-08-23T19:23:40Z

Build and deliver the complete, production-grade RentFlow Pro (module_rentals) Property Management & Rent Settlement module for Pixy on the Real Estate Space, transforming /rentals into a high-performance rental lifecycle, WhatsApp billing, and owner payout engine with zero impact on other spaces and 100% CRM integrity.

Working directory: g:/Pixy/agency-manager
Integrity mode: development

## Requirements

### R1. Database Schema & Multi-Tenant Isolation
- Create idempotent migration `supabase/migrations/20260823000000_property_leases_and_settlements.sql`:
  - `public.property_leases`: Stores active leases linking `property_id` (`service_catalog.id`), `tenant_id` (`leads.id`), `owner_id` (`leads.id`), `co_signer_id` (`leads.id` optional), `monthly_rent`, `admin_fee`, `admin_paid_by` (`'agency' | 'tenant'`), `commission_percentage` (default 8.00%), `vat_on_commission` (boolean, default true), `deposit_amount`, `payment_day` (1-31), `payout_day` (1-31), `start_date`, `end_date`, `status` (`'active' | 'pending' | 'expired' | 'defaulted' | 'terminated'`), `guarantee_type` (`'direct' | 'insurance' | 'bond' | 'deposit' | 'promissory_note'`), `guarantee_details` (JSONB), `bank_payout_details` (JSONB: bank, account_type, account_number, account_holder, id_number), `notes`.
  - `public.property_lease_settlements`: Stores monthly billing and owner payout records (`lease_id`, `period` e.g. "2026-09", `invoice_id`, `rent_amount`, `admin_fee_amount`, `gross_collected`, `commission_amount`, `vat_amount`, `deductions_amount`, `net_owner_payout`, `tenant_payment_status` (`'pending' | 'paid' | 'partial' | 'late'`), `tenant_paid_at`, `owner_payout_status` (`'pending' | 'paid' | 'held'`), `owner_paid_at`, `deductions` JSONB, `statement_pdf_url`, `payment_proof_url`, `receipt_number`).
  - Strict RLS policies enforcing `organization_id` isolation.
  - Zero structural changes to `public.leads` or other core tables.

### R2. Core Mathematical Engine & Server Actions
- Implement `src/modules/features/rentals/services/settlement-calculator.ts` with exact financial formulas:
  - Gross Collected = Monthly Rent + (Admin Fee if collected by agency)
  - Commission Amount = Monthly Rent * (Commission Rate / 100)
  - VAT Amount = Commission Amount * 0.19 (if vat_on_commission = true)
  - Net Owner Payout = Monthly Rent - Commission Amount - VAT Amount - (Admin Fee if paid by agency) - Approved Deductions
- Implement Server Actions:
  - `leases.ts`: `createLeaseAction`, `updateLeaseAction`, `terminateLeaseAction`, `getLeasesAction`, `getLeaseByIdAction`.
  - `settlements.ts`: `generateMonthlySettlementsAction`, `recordTenantPaymentAction`, `recordOwnerPayoutAction`, `addDeductionAction`, `getSettlementsAction`.
  - `whatsapp-notifier.ts`: Generates structured WhatsApp messages for tenant payment requests with PSE/Wompi links and owner payout statement links.

### R3. Admin Workspace & Reactive UI (/rentals)
- Create SSR-protected page `src/app/(dashboard)/rentals/page.tsx` with IAM checks, active only for `real_estate` space organizations.
- Build `RentalsWorkspace` (`src/modules/features/rentals/components/rentals-workspace.tsx`):
  - **KPI Header**: Total Active Leases, Monthly Expected Revenue, Past-due / Delinquency Sum, Pending Owner Payouts.
  - **Tab 1: Contratos Activos**: Interactive card/list view of active leases with property thumbnail, tenant, owner, rent, payment day, status badges, and quick actions (Edit, Terminate, View History).
  - **Tab 2: Control de Cobranza (Inquilinos)**: Real-time collection semáforo (Al Día, Por Vencer, En Mora, Siniestro Aseguradora) with 1-click WhatsApp payment reminders and payment logging.
  - **Tab 3: Liquidaciones a Propietarios**: Monthly owner payout ledger with live financial breakdown, deduction inspector, and "Marcar como Pagado & Enviar Extracto".
  - **LeaseFormSheet**: Multi-step drawer with search in properties (`service_catalog`) and contacts (`leads`), financial terms, bank account details, and guarantee setup.
  - **SettlementModal**: Interactive dialog to review the monthly statement, add maintenance deductions with receipt attachments, and generate statement links.

### R4. Sidebar & Space System Integration
- Register `module_rentals` in `src/modules/core/saas/module-config.ts` and `capabilities-registry.ts` as standard module for `real_estate`.
- Update `src/components/layout/sidebar.tsx` to render "Gestión de Arriendos" (`/rentals`) with `KeyRound` icon exclusively for `real_estate` organizations.

### R5. Realistic Seeding for Praxis Inmobiliaria
- Create and execute seeding script `src/scripts/seed-praxis-rentals.ts` for `Praxis Inmobiliaria` (`c41dcf16-f94d-499d-a1f8-bc9027206495`):
  - Seed 5 real estate contacts in `leads` (3 Inquilinos, 2 Propietarios with complete Colombian bank details).
  - Seed 4 active leases linking to existing rental properties in Ibagué (El Vergel, Calambeo, Piedra Pintada, Santa Ana).
  - Seed monthly settlements for current and previous month across different statuses (1 Paid on time, 1 Pending/Upcoming, 1 Late/Mora with reminder, 1 with a plumbing maintenance deduction).

### R6. Comprehensive Automated E2E Test Suite & Zero Regressions
- Expand `tests/e2e/catalog/runner.ts` with dedicated test suites:
  - Math & Tax Calculation Unit Tests (Gross, Commission, VAT, Deductions, Net Payouts).
  - Multi-Tenant RLS Boundaries & Isolation.
  - Lease State Machine & Lifecycle (Active -> Leased -> Terminated -> Available).
  - Cross-module non-interference test ensuring `leads`, `quotes`, `invoices`, and non-real-estate spaces operate with 0 side-effects.
- Guarantee 0 TypeScript compilation errors (`tsc --noEmit`).

## Acceptance Criteria

### Data Model & Mathematical Engine
- [ ] `property_leases` and `property_lease_settlements` execute cleanly in PostgreSQL with foreign keys and multi-tenant RLS.
- [ ] Financial calculations compute gross collection, 8% commission, 19% VAT, admin fees, and net owner payouts accurately down to the cent.
- [ ] Zero schema alterations made to `public.leads` or unrelated tables.

### User Interface & Workspace
- [ ] Navigating to `/rentals` displays the 3-Tab workspace with live KPIs, active lease cards, collection semáforo, and owner payout table.
- [ ] Creating a lease via `LeaseFormSheet` correctly saves all financial parameters, assigns tenant and landlord, and marks the property as rented.
- [ ] The sidebar displays "Gestión de Arriendos" for Real Estate tenants and is hidden for other spaces.

### Seeding & Real-World Validation
- [ ] 100% of automated tests pass in `tests/e2e/catalog/runner.ts`.
- [ ] `tsc --noEmit` returns 0 compilation errors.

## 2026-08-23T20:46:44Z

Perform a comprehensive 360° audit, empirical end-to-end workflow verification, UX/UI inspection, and architectural hardening of the RentFlow Pro (module_rentals) module and Real Estate Space on tenant Praxis Inmobiliaria (c41dcf16-f94d-499d-a1f8-bc9027206495), ensuring flawless mathematical calculations, zero cross-industry side effects, and pristine data integrity across all multi-tenant spaces.

Working directory: g:/Pixy/agency-manager
Integrity mode: development

## Requirements

### R1. Complete RentFlow Pro End-to-End Workflow & Edge-Case Verification
- Audit and test every user interaction in /rentals across the 3 core tabs:
  - Tab 1: Contratos Activos: Lease creation drawer (LeaseFormSheet), property selection (service_catalog), tenant & owner linking (leads), co-signer attachments, deposit tracking, rent & admin fee parameters, commission splits, and termination workflows.
  - Tab 2: Control de Cobranza (Inquilinos): Semáforo calculation (Al Día, Por Vencer, En Mora, Siniestro), 1-click WhatsApp payment reminders with dynamic URL links, payment recording, and partial/late payment edge cases.
  - Tab 3: Liquidaciones a Propietarios: Monthly period generation, deduction management with repair/maintenance evidence attachments, commission & VAT computations (8% + 19% IVA), net owner payout validation, and statement link generation.
- Validate state machine transitions and guards (e.g. preventing payouts before tenant collection unless insured, preventing duplicate periods).

### R2. Deep PropTech UX/UI & Usability Audit (Praxis Inmobiliaria Benchmark)
- Perform an exhaustive UX/UI review of the /rentals workspace, sheets, modals, and KPI cards:
  - Contrast, typographic hierarchy, responsive breakpoints (mobile, tablet, desktop), and dark/light theme consistency.
  - Visual clarity of financial breakdowns (gross collected, commission, IVA, deductions, net to owner).
  - Empty states, loading skeletons, validation error states, and intuitive micro-interactions.
  - Identification of any clunky flows, confusing labels, redundant clicks, or missing shortcuts.

### R3. Cross-Industry Catalog & Space Zero-Regression Audit
- Verify that the Universal Catalog (/portfolio), Storefront Portal (/tienda), and CRM operations remain 100% unaffected for all non-real-estate spaces (agency, resto, cleaning, retail, saas).
- Ensure no real estate rental logic, metadata leaks, or UI elements pollute non-real-estate items or tenant workspaces.
- Verify strict backwards compatibility with Quotes (/quotes), Invoices (/invoicing), Contracts (/hosting), and Briefings.

### R4. Relational Data Integrity, RLS Security & Performance
- Audit database schemas (property_leases, property_lease_settlements), foreign key constraints, unique indexes, and multi-tenant Row Level Security (RLS).
- Guarantee zero data leakage between different organizations.
- Benchmark and optimize query performance, server action execution times, and cache invalidation hooks.

### R5. Comprehensive Automated E2E Test Matrix Expansion & Technical Debt Report
- Expand the automated test runner (tests/e2e/catalog/runner.ts) with exhaustive new test suites covering:
  - Complex multi-month settlement roll-forwards.
  - Prorated rent calculations, multi-deduction matrices, and tax edge cases.
  - Cross-space isolation invariants.
- Produce a structured Technical Debt & Audit Findings report highlighting all identified bugs, inconsistencies, and recommended enhancements.

## Acceptance Criteria

### Workflow & Functional Integrity
- [ ] All lease creation, tenant collection, payment logging, deduction recording, and owner payout flows execute with zero runtime errors.
- [ ] Financial calculations match Colombian real estate accounting standards down to the cent across all edge cases.
- [ ] WhatsApp notification links generate properly formatted messages and URLs.

### UX / UI & Usability
- [ ] 0 visual glitches, contrast flaws, or responsive layout issues across Light/Dark modes in /rentals.
- [ ] All modals, sheets, and drawers provide smooth transitions, clear validations, and intuitive confirmation steps.

### Cross-Industry & Security Guardrails
- [ ] 0 regressions or behavioral changes in Catalog, Storefront, Quotes, or CRM across all non-real-estate spaces.
- [ ] Strict multi-tenant isolation confirmed with 0 cross-organization data access.
- [ ] tsc --noEmit returns 0 compilation errors.
- [ ] 100% of automated test suites in tests/e2e/catalog/runner.ts pass with 0 failures.
