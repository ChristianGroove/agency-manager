# Billing System Refinement & UI Standardization

## Phase 0: UI Standardization
- [x] Implement Searchable `Combobox` in `AddServiceModal` <!-- id: 13 -->
- [x] Implement Searchable `Combobox` in `CreateInvoiceModal` <!-- id: 14 -->
- [x] Implement Searchable `Combobox` in `QuoteFormModal` <!-- id: 15 -->
- [x] Implement Searchable `Combobox` in `BriefingFormModal`
- [x] Fix scroll issues and "Name + Company" layout

## Phase 1: Database Schema & Migration
- [x] Create `billing_cycles` table schema <!-- id: 1 -->
- [x] Add `service_start_date` and `billing_cycle_start_date` to `services` table <!-- id: 100 -->
- [x] Create migration SQL to backfill cycles from existing invoices <!-- id: 2 -->
- [x] Apply migrations to Supabase (User Confirmed) <!-- id: 3 -->
- [x] Update `types/index.ts` with new fields <!-- id: 4 -->

## Phase 2: Logic & Automation (Model A+)
- [x] Update `AddServiceModal`:
    - [x] Remove immediate invoice generation for recurring services <!-- id: 5a -->
    - [x] Add Date Picker for `service_start_date` <!-- id: 5b -->
    - [x] Calculate and save `billing_cycle_start_date` (= service_start_date) <!-- id: 5c -->
    - [x] Calculate and save `next_billing_date` (= cycle start + frequency) <!-- id: 5d -->
    - [x] Add "Retroactive Billing Check" logic (Modal + Metadata) <!-- id: 5e -->
- [x] Implement "Binder" / "Lazy Evaluator" to generate invoices only when `next_billing_date` is reached <!-- id: 6 -->
- [x] Update `ServiceDetails` to show Cycle History <!-- id: 7 -->

## Phase 3: Invoice Generation
- [x] Refactor Invoice Generation to depend on Billing Cycle rules <!-- id: 8 -->
- [x] Ensure `Service` -> `BillingCycle` -> `Invoice` flow is respected <!-- id: 9 -->

## Phase 4: UI & Verification
- [x] Add "Ciclos de Facturación" view tab in Service Details <!-- id: 10 -->
- [x] Verify no duplicate invoices are created <!-- id: 11 -->
- [x] Verify historical data integrity <!-- id: 12 -->

## Phase 5: Invoice Deletion Consistency
- [x] Backend: Implement DB Trigger to auto-cancel invoices on service delete
- [x] Automation: Prevent regeneration of invoices for deleted services
- [x] Frontend: Add "Cancelada" badge to UI to prevent confusion
- [x] Contract Module: Explicit feedback on deletion
- [x] Client Module: Explicit feedback on deletion

## Phase 6: Dashboard Insights Debugging
- [x] Identify which metrics are failing (Revenue, Active Clients, MRR using wrong table) <!-- id: 20 -->
- [x] Analyze `getDashboardMetrics` data fetching logic <!-- id: 21 -->
- [x] Fix data calculation bugs (Switch `subscriptions` to `services`, add filters) <!-- id: 22 -->
- [x] Verify against database actuals (Audit complete & Fixed Reactivity) <!-- id: 23 -->

## Phase 7: Retroactive Invoice Semantics
- [x] Schema: Add `metadata` jsonb or `is_late_issued` boolean to `invoices` <!-- id: 24 -->
- [x] Logic: Update `AddServiceModal` to flag retroactive invoices <!-- id: 25 -->
- [x] Logic: Update `billing-automation` to flag late invoices? (Maybe, mostly modal) <!-- id: 26 -->
- [x] UI: Add "Emitido tardíamente" badge to Service Details / Portal <!-- id: 27 -->
- [x] UI: Add warning text to "Generate Overdue" modal option <!-- id: 28 -->
- [x] PDF: Add "Documento emitido de forma posterior" disclaimer <!-- id: 29 -->

## Phase 8: Client Details UX Refinement
- [x] UI: Integrate actions (View/Share/Pay) into Service Card invoice rows <!-- id: 30 -->
- [x] UI: Clean up Service Card footer (Remove ambiguous actions) <!-- id: 31 -->
- [x] Logic: Update `getUnlinkedInvoices` to filter out deleted service invoices <!-- id: 32 -->
- [x] UI: Rename "Facturas Generales" to "Facturas Manuales / Ocasionales" <!-- id: 33 -->

## Phase 9: Portal Debugging
- [x] Logic: Fix Portal invoice fetching to exclude `cancelled` invoices <!-- id: 34 -->

## Phase 10: State Standardization (Refactor)
- [x] Type: Define strict canonical enums (Service, Cycle, Invoice) <!-- id: 35 -->
- [x] Logic: Create `src/lib/domain-logic.ts` for derived states <!-- id: 36 -->
- [x] DB: Migration to align Invoice status (`cancelled` -> `void`) <!-- id: 37 -->
- [x] UI: Create `StatusBadge` component with unified mapping <!-- id: 38 -->
- [x] UI: Refactor Service/Invoice lists to use new logic <!-- id: 39 -->
- [x] Verify: Dashboard/Portal health checks <!-- id: 40 -->

## Phase 11: Centralized State Engine (Pure Domain)
- [x] Structure: Create `src/lib/state-engine` (or `src/domain/state`) <!-- id: 41 -->
- [x] Logic: Implement `resolveServiceState` & `deriveServiceHealth` <!-- id: 42 -->
- [x] Logic: Implement `resolveCycleState` & `resolveDocumentState` <!-- id: 43 -->
- [x] Logic: Implement `deriveFinancialState` <!-- id: 44 -->
- [x] Test: Unit tests for critical scenarios (Active+Overdue, etc) <!-- id: 45 -->

## Phase 12: Progressive State Integration
- [x] Integrate: Document State (Invoices) <!-- id: 47 -->
- [x] Integrate: Cycle State (Billing Cycles) <!-- id: 48 -->
- [x] Integrate: Service State (Status Badge) <!-- id: 49 -->

## Phase 25: Critical Fixes & Improvements
- [x] Add `emitter_id` to `quotes` table <!-- id: 100 -->
- [x] Add Emitter Selector to `QuoteBuilder` <!-- id: 101 -->
- [x] Implement Unified Invoice Conversion (Hybrid Logic) <!-- id: 102 -->
- [x] HOTFIX: Fix Emitter Loading from `billing_emitters` <!-- id: 103 -->
- [x] Refactor: Deprecate `domain-logic.ts` (Done & Deleted) <!-- id: 46 -->

## Phase 13: Domain Event Log (Audit)
- [x] Schema: Create `domain_events` table migration <!-- id: 50 -->
- [x] Logic: Implement `logDomainEvent` function <!-- id: 51 -->
- [x] Integrate: Service Actions (Create, Pause, Resume) <!-- id: 52 -->
- [x] Integrate: Billing Actions (Generate Cycle, Invoice) <!-- id: 53 -->
- [x] Integrate: Payment Actions (Wompi Webhook) <!-- id: 54 -->
- [x] Verify: Check logs in Supabase (Manual) <!-- id: 55 -->

## Phase 14: Client Activity Timeline (Feature)
- [x] Logic: Create `getClientHistory` server action <!-- id: 56 -->
- [x] UI: Create `ClientTimeline` component <!-- id: 57 -->
- [x] Integrate: Add Timeline to Client Details View <!-- id: 58 -->

## Phase 15: Client Timeline Polish (UI)
- [x] UI: Implement Spanish translation for Event Types <!-- id: 59 -->
- [x] UI: Improve Actor/User display logic <!-- id: 60 -->

## Phase 16: Quotes Refactor - Catalog & Recurrence
- [x] DB: Update `quote_items` schema (catalog_id, recurrence) <!-- id: 61 -->
- [x] UI: Implement Hybrid Selector (Catalog/Manual) in QuoteForm <!-- id: 62 -->
- [x] UI: Add Recurrence Configuration (Frequency) for items <!-- id: 63 -->
- [x] Logic: Update Save Quote action to persist new metadata <!-- id: 64 -->
- [x] Logic: Calculate projected recurring totals vs setup totals <!-- id: 65 -->

## Phase 17: Quote Builder UX Refactor (Single View)
- [x] Backend: Create `quickCreateProspect` server action <!-- id: 66 -->
- [x] UI: Create `QuoteBuilder` monolithic component <!-- id: 67 -->
- [x] UI: Connect "Convert" button in Quote Detail to new action <!-- id: 75 -->

## Phase 19: Catalog & Migration Fix
- [x] DB: Create migration for `is_visible_in_portal` <!-- id: 76 -->
- [x] UI: Restore catalog filter in QuoteBuilder <!-- id: 77 -->
- [x] UX: Provide instructions/UI to mark items as catalog <!-- id: 78 -->

## Phase 20: Catalog Architecture Refactor
- [x] DB: Migration for `is_catalog_item` column <!-- id: 79 -->
- [x] DB: Script to mark existing null-client services as catalog <!-- id: 80 -->
- [x] API: Update `QuoteBuilder` fetch to strictly use `is_catalog_item` <!-- id: 81 -->
- [x] Logic: Update `convertQuote` to copy `briefing_template_id` <!-- id: 82 -->
- [x] UI: Update Catalog Page to show only catalog items <!-- id: 83 -->
- [x] UI: Integrate Smart Items (Catalog + Recurrence) into Builder <!-- id: 69 -->
- [x] Page: Set up `/quotes/create` route <!-- id: 70 -->

## Phase 21: Quotes Lifecycle & UI Upgrade
- [x] DB: Expand Quote Status Enum (converted, expired, etc) <!-- id: 84 -->
- [x] Backend: Implement `duplicateQuote` & Status Updates <!-- id: 85 -->
- [x] UI: Modernize Quotes Table (Badges, Recurrence Icon) <!-- id: 86 -->
- [x] UI: Enhanced Actions Dropdown (Duplicate, Convert, Send) <!-- id: 87 -->

## Phase 22: Quote Creation UX Refactor (Sheet)
- [x] Refactor `QuoteBuilder` to support "Sheet Mode" (Props) <!-- id: 88 -->
- [x] Create `CreateQuoteSheet` component <!-- id: 89 -->
- [x] Integrate Sheet into `QuotesPage` (Remove Create Page Nav) <!-- id: 90 -->
- [x] Redesign QuoteBuilder Layout (Split View, Live Receipt) <!-- id: 91 -->
- [x] Fix accessibility violation in CreateQuoteSheet <!-- id: 92 -->
- [x] Apply "Floating Glass" Aesthetics (Rounded, Shadows, Backdrop) <!-- id: 93 -->
- [x] Remove redundant "Back Arrow" in favor of Close X <!-- id: 94 -->

## Phase 24: Smart Quote Conversion Logic
- [x] Implement `convertQuoteToEntities` Bucket Logic <!-- id: 95 -->
    - [x] Bucket A: Recurring -> Group by Frequency -> Create Service + Cycle + First Invoice
    - [x] Bucket B: One-Off -> Create Single Pending Invoice
- [x] Inherit `briefing_template_id` from Catalog Items <!-- id: 96 -->
- [x] Return detailed summary of created entities <!-- id: 97 -->
- [x] FIX: Service Amount = 0 & Next Billing Date Missing <!-- id: 98 -->
- [x] FIX: Idempotency (Prevent Duplicate Conversion) & Verify One-Offs <!-- id: 99 -->
