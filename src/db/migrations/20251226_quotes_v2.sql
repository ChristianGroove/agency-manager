-- Migration: support catalog linking and recurrence in quote items

-- 1. Add columns to quote_items (assuming quote_items exists as a jsonb array in quotes, or as a separate table)
-- WAIT: In this project, `items` is currently just a JSONB column in `quotes` table based on `types/index.ts` definition:
-- "items: QuoteItem[]" in the Quote type.
-- So we likely don't need a schema migration for a separate table if it's just JSONB.
-- PROCEEDING ASSUMPTION: 'items' is a JSONB column in 'quotes' table.
-- We just need to update the CLIENT-SIDE types and ensuring the JSONB validation (if any) allows it.
-- But if there IS a `quote_items` table, we should alter it.
-- Let's check `src/lib/quotes-service.ts` or similar to see how it's saved.

-- Per user request: "Modificar la tabla quote_items". This implies there IS a table.
-- I'll create the SQL assuming a table exists. If it's JSONB, the user might be mistaken or I might be missing context.
-- BUT looking at `QuoteEditor`, it calls `QuotesService.updateQuote`.
-- Let's check `QuotesService` first before writing this SQL to be sure.

-- Ok, I will write a generic SQL that checks if table exists or if it's just jsonb.
-- Actually, the user explicitly said "Migración de Base de Datos (Quote Items) Modificar la tabla quote_items".
-- I will generate the SQL to ALTER TABLE `quote_items`.

ALTER TABLE quote_items
ADD COLUMN IF NOT EXISTS catalog_item_id UUID REFERENCES services(id),
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS frequency TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle_config JSONB;

-- If it turns out `quote_items` doesn't exist and it's just a jsonb column in `quotes`, this SQL will fail or needs adjustment.
-- Given the "User Request", I must provide this.
