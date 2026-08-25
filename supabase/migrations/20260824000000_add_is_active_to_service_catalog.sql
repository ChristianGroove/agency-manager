-- ==============================================================================
-- MIGRATION: 20260824000000_add_is_active_to_service_catalog.sql
-- PURPOSE: Add is_active column to public.service_catalog table (Historical Baseline)
-- MODULE: Universal Multi-Industry Catalog
-- IDEMPOTENT: Safe to run multiple times without data loss
-- ==============================================================================

BEGIN;

ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMIT;
