-- =====================================================
-- Migration: Domain Management System
-- Date: 2025-01-01
-- Description: Add domain configuration support for platform and organizations
-- =====================================================

-- =====================================================
-- PART 1: Extend platform_settings with domain config
-- =====================================================

-- Add domain columns to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS admin_domain TEXT DEFAULT 'control.pixy.com.co',
ADD COLUMN IF NOT EXISTS portal_domain TEXT DEFAULT 'mi.pixy.com.co',
ADD COLUMN IF NOT EXISTS domain_updated_at TIMESTAMPTZ;

-- Add validation constraints for platform domains
ALTER TABLE public.platform_settings
DROP CONSTRAINT IF EXISTS valid_admin_domain,
DROP CONSTRAINT IF EXISTS valid_portal_domain,
DROP CONSTRAINT IF EXISTS different_platform_domains;

ALTER TABLE public.platform_settings
ADD CONSTRAINT valid_admin_domain CHECK (admin_domain ~ '^[a-z0-9\-\.]+$'),
ADD CONSTRAINT valid_portal_domain CHECK (portal_domain ~ '^[a-z0-9\-\.]+$'),
ADD CONSTRAINT different_platform_domains CHECK (admin_domain != portal_domain);

-- Add comments
COMMENT ON COLUMN public.platform_settings.admin_domain IS 'Default admin panel domain for all verticals';
COMMENT ON COLUMN public.platform_settings.portal_domain IS 'Default client portal domain for all verticals';
COMMENT ON COLUMN public.platform_settings.domain_updated_at IS 'Timestamp of last domain configuration update';

-- Update existing row with default values
UPDATE public.platform_settings
SET 
    admin_domain = 'control.pixy.com.co',
    portal_domain = 'mi.pixy.com.co',
    domain_updated_at = NOW()
WHERE id = 1 AND admin_domain IS NULL;

-- =====================================================
-- PART 2: Extend organizations with custom domain support
-- =====================================================

-- Add custom domain columns to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS custom_admin_domain TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_portal_domain TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS use_custom_domains BOOLEAN DEFAULT FALSE;

-- Add validation constraints for organization custom domains
ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS valid_custom_admin_domain,
DROP CONSTRAINT IF EXISTS valid_custom_portal_domain,
DROP CONSTRAINT IF EXISTS different_custom_domains;

ALTER TABLE public.organizations
ADD CONSTRAINT valid_custom_admin_domain CHECK (
    custom_admin_domain IS NULL OR custom_admin_domain ~ '^[a-z0-9\-\.]+$'
),
ADD CONSTRAINT valid_custom_portal_domain CHECK (
    custom_portal_domain IS NULL OR custom_portal_domain ~ '^[a-z0-9\-\.]+$'
),
ADD CONSTRAINT different_custom_domains CHECK (
    custom_admin_domain IS NULL OR 
    custom_portal_domain IS NULL OR 
    custom_admin_domain != custom_portal_domain
);

-- Add comments
COMMENT ON COLUMN public.organizations.use_custom_domains IS 'If true, use custom_*_domain instead of platform defaults';
COMMENT ON COLUMN public.organizations.custom_admin_domain IS 'Organization-specific admin domain (overrides platform, requires super_admin approval)';
COMMENT ON COLUMN public.organizations.custom_portal_domain IS 'Organization-specific portal domain (overrides platform, requires super_admin approval)';

-- =====================================================
-- VERIFICATION QUERIES (commented out, for manual testing)
-- =====================================================

-- Verify platform_settings columns
-- SELECT id, admin_domain, portal_domain, domain_updated_at FROM public.platform_settings;

-- Verify organizations columns
-- SELECT id, name, use_custom_domains, custom_admin_domain, custom_portal_domain FROM public.organizations LIMIT 5;
