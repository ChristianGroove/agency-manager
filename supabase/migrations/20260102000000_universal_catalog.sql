-- ============================================
-- FASE 9: UNIVERSAL CATALOG MIGRATION
-- Date: 2026-01-02
-- Description: Enable universal catalog adaptability via JSONB metadata
-- ============================================

-- 1. Add metadata column for vertical-specific fields
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.service_catalog.metadata IS 'Flexible storage for vertical-specific fields (e.g. briefing_template_id for agencies, property_specs for real estate)';

-- 2. Create index for high-performance JSONB querying
CREATE INDEX IF NOT EXISTS idx_service_catalog_metadata ON public.service_catalog USING GIN(metadata);

-- 3. (Optional) Future-proof: Add 'is_template' if we want global catalog templates later
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS is_system_template BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.service_catalog.is_system_template IS 'If true, this item serves as a blueprint for seeding other organizations catalogues';
