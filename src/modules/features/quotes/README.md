# Quotes Module (Features)

Surgical migration of the quotes module from `core` to `features`, implementing a clean 3-tier architecture.

## Architecture

This module follows a strictly decoupled 3-tier architecture:

### 1. Service Layer (`services/`)
- **Responsibility**: Pure business logic and database interactions.
- **Pattern**: Asynchronous functions that use the Supabase client.
- **Rules**: 
  - No Next.js framework calls (no `revalidatePath`, no `redirect`).
  - Scoped to the current organization via `getCurrentOrganizationId`.
  - Returns raw data or standard response objects `{ success: boolean, data?: T, error?: string }`.

### 2. Action Layer (`quotes-actions.ts`)
- **Responsibility**: Framework-level entry points (Next.js Server Actions).
- **Pattern**: Functions with `"use server"`.
- **Rules**:
  - Acts as a wrapper around the Service Layer.
  - Handles cache revalidation using `revalidatePath`.
  - Handles redirects or navigation logic.
  - Entry point for all UI components.

### 3. UI Layer (`components/`)
- **Responsibility**: Presentation and user interaction.
- **Rules**:
  - Consume logic ONLY through the Action Layer (Server Actions).
  - Divided into specialized components like `QuoteBuilder`, `QuoteEditor`, and `QuotesView`.

## Key Files
- `services/quotes-service.ts`: Core CRUD operations.
- `services/conversion-service.ts`: Logic for converting quotes to invoices.
- `quotes-actions.ts`: Unified server actions.
- `components/quotes-view.tsx`: Main dashboard component.

## How to Extend
1. **New Database Logic**: Add a function to `services/quotes-service.ts`.
2. **Expose to UI**: Create a corresponding action in `quotes-actions.ts`.
3. **Use in UI**: Call the action from a component.

## Integration
This module is integrated with:
- **CRM**: Linking quotes to leads.
- **Billing**: Converting quotes to invoices.
- **Messaging**: Sending quotes via WhatsApp.
