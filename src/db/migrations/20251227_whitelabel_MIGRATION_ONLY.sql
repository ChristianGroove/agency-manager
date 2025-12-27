-- ================================================================
-- WHITE-LABEL PHASE 2: Premium Brand Kit Infrastructure
-- MIGRATION ONLY (Sin verificaciones)
-- ================================================================

-- Add portal branding columns
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

-- Add email branding columns
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

-- Add typography column
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

-- Add documentation comments
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
