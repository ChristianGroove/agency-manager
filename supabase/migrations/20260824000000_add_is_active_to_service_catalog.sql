-- ==============================================================================
-- MIGRATION: 20260824000000_add_is_active_to_service_catalog.sql
-- PURPOSE: Add is_active and updated_at columns to public.service_catalog table
-- MODULE: Universal Multi-Industry Catalog
-- IDEMPOTENT: Safe to run multiple times without data loss
-- ==============================================================================

BEGIN;

-- 1. Add is_active column to service_catalog if not exists
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Add updated_at column to service_catalog if not exists
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Backfill nulls if any exist
UPDATE public.service_catalog
SET is_active = true
WHERE is_active IS NULL;

UPDATE public.service_catalog
SET updated_at = now()
WHERE updated_at IS NULL;

-- 4. Create index for fast status filtering
CREATE INDEX IF NOT EXISTS idx_service_catalog_is_active 
ON public.service_catalog USING btree (organization_id, is_active)
WHERE deleted_at IS NULL;

COMMIT;
