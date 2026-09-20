-- Add portal_title column to organization_settings table
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS portal_title TEXT;

COMMENT ON COLUMN public.organization_settings.portal_title IS 'Custom portal display title for the organization / client portal';