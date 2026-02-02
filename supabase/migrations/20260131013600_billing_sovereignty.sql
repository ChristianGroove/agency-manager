-- ============================================
-- BILLING SOVEREIGNTY MIGRATION
-- Date: 2026-01-31
-- ============================================

-- Add allow_direct_billing to organizations
-- DEFAULT true maintains current behavior for legacy/direct clients
-- Resellers can set this to false for their sub-tenants
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS allow_direct_billing BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.organizations.allow_direct_billing IS 'Si es true, permite al cliente final comprar add-ons (branding, etc) directamente a Pixy.';

-- Add index for performance in permission checks
CREATE INDEX IF NOT EXISTS idx_orgs_direct_billing ON public.organizations(allow_direct_billing);

-- Update register_billable_event (optional: could add logic here too)
-- For now, we trust the UI check and the server actions.
