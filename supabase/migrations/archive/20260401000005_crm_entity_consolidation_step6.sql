-- ============================================
-- CRM ENTITY CONSOLIDATION — STEP 6: FIX CATEGORIES
-- Date: 2026-04-01
-- Description: Add missing category_id to leads and backfill it 
--              from the legacy clients table so the UI forms don't crash.
-- ============================================

-- 1. Add the column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS category_id UUID;

-- 2. Add Foreign Key mapping it to client_categories
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_category_id_fkey') THEN
        ALTER TABLE public.leads
        ADD CONSTRAINT leads_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES public.client_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Backfill the existing categories from the old clients table to leads
UPDATE public.leads l
SET category_id = c.category_id
FROM public.clients c
WHERE l.id = c.id
  AND c.category_id IS NOT NULL
  AND l.category_id IS NULL;

-- 4. Notify PostgREST to reload its cache so the form works instantly
NOTIFY pgrst, 'reload schema';
