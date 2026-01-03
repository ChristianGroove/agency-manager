-- ============================================
-- GLOBAL LOCALIZATION SCHEMA
-- Date: 2026-01-01
-- Purpose: Support vertical-specific and user-specific language settings
-- ============================================

-- 1. ADD LANGUAGE TO ORGANIZATION SETTINGS (Vertical Isolation)
-- Checks if column exists first to be idempotent
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_settings' AND column_name = 'default_language') THEN
        ALTER TABLE public.organization_settings ADD COLUMN default_language TEXT DEFAULT 'es';
    END IF;
END $$;

COMMENT ON COLUMN public.organization_settings.default_language IS 'Default language for this vertical/organization (es, en, etc)';

-- 2. ADD LANGUAGE TO PROFILES (Super Admin / User Consistency)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'language_preference') THEN
        ALTER TABLE public.profiles ADD COLUMN language_preference TEXT DEFAULT 'es';
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.language_preference IS 'User interface language preference';

-- Log success
DO $$
BEGIN
    RAISE NOTICE '✅ LOCALIZATION SCHEMA APPLIED: Language columns added';
END $$;
