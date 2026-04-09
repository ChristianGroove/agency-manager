-- Add email_style column to organization_settings
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS email_style TEXT DEFAULT 'minimal';

-- Add email_style to platform_settings for global default
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS email_style TEXT DEFAULT 'neo';
