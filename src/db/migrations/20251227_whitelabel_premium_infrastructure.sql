-- ================================================================
-- WHITE-LABEL PHASE 2: Premium Brand Kit Infrastructure
-- Module: module_whitelabel (Premium)
-- ================================================================

-- Add advanced branding columns to organization_settings
-- These fields are infrastructure for module_whitelabel premium features

-- STEP 1: Add portal branding columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' 
        AND column_name = 'portal_favicon_url'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN portal_favicon_url TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' 
        AND column_name = 'portal_login_background_url'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN portal_login_background_url TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' 
        AND column_name = 'portal_login_background_color'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN portal_login_background_color TEXT DEFAULT '#F3F4F6';
    END IF;
END $$;

-- STEP 2: Add email branding columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' 
        AND column_name = 'email_footer_text'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN email_footer_text TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' 
        AND column_name = 'show_powered_by_footer'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN show_powered_by_footer BOOLEAN DEFAULT true;
    END IF;
END $$;

-- STEP 3: Add typography column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' 
        AND column_name = 'brand_font_family'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN brand_font_family TEXT DEFAULT 'Inter';
    END IF;
END $$;

-- STEP 4: Add comments for documentation
COMMENT ON COLUMN organization_settings.portal_favicon_url IS 
'Custom favicon for client portal (module_whitelabel premium)';

COMMENT ON COLUMN organization_settings.portal_login_background_url IS 
'Custom background image for portal login screen (module_whitelabel premium)';

COMMENT ON COLUMN organization_settings.portal_login_background_color IS 
'Background color for portal login screen, defaults to light gray (module_whitelabel premium)';

COMMENT ON COLUMN organization_settings.email_footer_text IS 
'Custom footer text for transactional emails (module_whitelabel premium)';

COMMENT ON COLUMN organization_settings.show_powered_by_footer IS 
'Whether to show "Powered by" footer in portal. Can only be disabled with module_whitelabel.';

COMMENT ON COLUMN organization_settings.brand_font_family IS 
'Custom font family for portal branding (module_whitelabel premium)';

-- STEP 5: Verify columns were created
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_settings'
AND column_name IN (
    'portal_favicon_url',
    'portal_login_background_url', 
    'portal_login_background_color',
    'email_footer_text',
    'show_powered_by_footer',
    'brand_font_family'
)
ORDER BY column_name;

-- Expected: 6 rows showing all new columns

-- STEP 6: Check Pixy's current values (should be NULL/defaults)
SELECT 
    o.name as organization,
    os.portal_favicon_url,
    os.portal_login_background_color,
    os.show_powered_by_footer,
    os.brand_font_family
FROM organizations o
JOIN organization_settings os ON o.id = os.organization_id
WHERE o.name = 'Pixy Agency';

-- ================================================================
-- NOTES FOR IMPLEMENTATION:
-- ================================================================
-- 1. These columns are INFRASTRUCTURE ONLY
-- 2. UI will conditionally show based on module_whitelabel
-- 3. Login/Email application logic comes in Phase 3
-- 4. All columns nullable except defaults (for flexibility)
-- ================================================================
