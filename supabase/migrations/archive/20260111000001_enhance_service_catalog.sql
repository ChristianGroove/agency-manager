-- ============================================
-- FASE 36: INBOX SIDEBAR REDESIGN - CATALOG ENHANCEMENTS
-- Date: 2026-01-11
-- Description: Add image_url and category columns to service_catalog for enhanced product selector
-- ============================================

-- 1. Add new columns
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS category text;

-- 2. Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON public.service_catalog(category);

-- 3. Update RLS policies if necessary (existing ones should cover select/insert/update based on org)
--    (Assuming existing policies allow organization members to read/write their catalog)

-- 4. Audit comment
COMMENT ON COLUMN public.service_catalog.image_url IS 'URL to product thumbnail image';
COMMENT ON COLUMN public.service_catalog.category IS 'Product category for grouping in selector';
