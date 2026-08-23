-- Add portal_theme_config column to organization_settings table
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS portal_theme_config JSONB DEFAULT '{}'::jsonb;
