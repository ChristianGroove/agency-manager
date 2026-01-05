-- Add Branding Fields to Organization Settings

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS custom_domain TEXT,
ADD COLUMN IF NOT EXISTS custom_domain_status TEXT DEFAULT 'pending', -- pending, verified, error
ADD COLUMN IF NOT EXISTS invoice_footer TEXT,
ADD COLUMN IF NOT EXISTS document_logo_size TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS document_show_watermark BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS social_linkedin TEXT,
ADD COLUMN IF NOT EXISTS social_youtube TEXT;
