-- Migration: Add isotipo_url to organization_settings
-- Date: 2025-12-30
-- Description: Adds support for custom favicons per organization

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS isotipo_url text;

-- Add comment used for documentation if needed
COMMENT ON COLUMN organization_settings.isotipo_url IS 'URL of the organization favicon/isotype';
