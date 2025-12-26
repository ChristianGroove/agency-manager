# Walkthrough: Billing System & Client Logic Improvements

This session focused on fixing critical logic issues in the Emitter/Billing system and ensuring Client Card totals accurately reflect active data (ignoring deleted items).

## Part 1: Emitter Integration & Document Types

### Problem
- Invoices were defaulting to "Factura Electrónica" even for "Persona Natural" emitters.
- New services were creating initial invoices without a defined document type.

### Solution
1.  **Strict Typing**: Implemented logic to strictly derive `document_type` from the Emitter's `emitter_type`:
    *   `NATURAL` → `CUENTA_DE_COBRO`
    *   `JURIDICO` → `FACTURA_ELECTRONICA`
2.  **Persistence**: Added `document_type` column to `invoices` and ensured it is saved during creation in both `CreateInvoiceModal` and `AddServiceModal`.
3.  **UI Feedback**: Updated modals and pages to dynamically display the correct title ("Cuenta de Cobro" vs "Factura").

## Part 2: Client Card Logic (Deleted Items)

### Problem
- Client Cards in the dashboard were showing incorrect "Debt" and "Active Services" counts because they were including soft-deleted items.
- "Quick View" invoice lists still showed deleted invoices.

### Solution
1.  **Enhanced Filtering**: Updated the calculation logic in `src/app/(dashboard)/clients/page.tsx` to explicitly filter out items where `deleted_at` is set.
2.  **Database Query**: Updated the `fetchClients` Supabase query to request `deleted_at` for supported tables (`invoices`, `quotes`).
3.  **Stability Fix**: Identified that `services` and `subscriptions` tables were missing the `deleted_at` column, causing a crash. Reverted the query for those tables and created a migration script (`supabase/add_soft_deletes_to_services.sql`) to add the missing columns for future support.

## Key Files Modified
- `src/components/modules/invoices/create-invoice-modal.tsx`: Fixed emitter logic.
- `src/components/modules/services/add-service-modal.tsx`: Added Persistence for new services.
- `src/app/(dashboard)/clients/page.tsx`: Fixed total calculation and filtering.
- `src/types/index.ts`: Updated type definitions.
- `supabase/add_soft_deletes_to_services.sql`: New migration script.
- `src/lib/state-engine/*`: New centralized state logic.

## Verification
- **Billing**: Validated that selecting a "Natural Person" emitter generates a "Cuenta de Cobro".
- **Dashboard**: Validated that deleting an invoice immediately reduces the "Debt" total on the Client Card.
- **Stability**: Confirmed the dashboard loads without errors.
- **State Engine**: Verified correct status resolution for Services, Cycles, and Invoices.

## Part 15: Domain Event Log (Phase 13)
Implemented an immutable audit system (`domain_events`) to track system state changes without affecting core logic.
1.  **Schema**: Created `domain_events` table with `entity_type`, `event_type`, `payload`, and `triggered_by`.
2.  **Instrumentation**:
    -   **Services**: Logging creation, updates, pausing, and resizing (`add-service-modal`, `services-actions`).
    -   **Billing**: Logging invoice generation and cycle transitions (`billing-automation.ts`).
    -   **Payments**: Logging Wompi payment confirmations (`webhook`).
3.  **Safety**: Used a fail-safe logger that suppresses errors to prevent audit failures from blocking critical business flows.
