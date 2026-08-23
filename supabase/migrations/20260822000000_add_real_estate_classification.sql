-- ==============================================================================
-- MIGRATION: 20260822000000_add_real_estate_classification.sql
-- PURPOSE: Support Real Estate & Property Classification in service_catalog
-- IDEMPOTENT: Safe to run multiple times
-- ==============================================================================

DO $$
BEGIN
    -- 1. Update classification check constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.service_catalog'::regclass 
        AND conname = 'service_catalog_classification_check'
    ) THEN
        ALTER TABLE public.service_catalog DROP CONSTRAINT service_catalog_classification_check;
    END IF;

    ALTER TABLE public.service_catalog
    ADD CONSTRAINT service_catalog_classification_check 
    CHECK (classification = ANY (ARRAY['physical'::text, 'digital'::text, 'service'::text, 'subscription'::text, 'real_estate'::text]));

    -- 2. Update legacy type check constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.service_catalog'::regclass 
        AND conname = 'service_catalog_type_check'
    ) THEN
        ALTER TABLE public.service_catalog DROP CONSTRAINT service_catalog_type_check;
    END IF;

    ALTER TABLE public.service_catalog
    ADD CONSTRAINT service_catalog_type_check 
    CHECK (type = ANY (ARRAY['recurring'::text, 'one_off'::text, 'product'::text, 'physical'::text, 'digital'::text, 'service'::text, 'subscription'::text, 'real_estate'::text]));

    -- 3. Add real_estate_details column if not exists
    ALTER TABLE public.service_catalog
    ADD COLUMN IF NOT EXISTS real_estate_details JSONB DEFAULT '{}'::jsonb;
END $$;
