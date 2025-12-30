-- Migration: Ensure all branding columns exist
-- Date: 2025-12-30
-- Description: Safely adds all possible branding columns to organization_settings to prevent render errors.

-- General Branding
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS agency_name text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS agency_website text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS main_logo_url text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS portal_logo_url text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS isotipo_url text; -- The one causing recent error

-- Colors & Styles
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS portal_primary_color text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS portal_secondary_color text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS portal_login_background_url text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS brand_font_family text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS portal_login_background_color text;

-- Socials
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS social_facebook text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS social_instagram text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS social_twitter text;

-- Document Branding (Extra safety)
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS document_primary_color text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS document_secondary_color text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS document_logo_url text;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS document_font_family text;
