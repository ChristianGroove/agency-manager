-- ============================================
-- CAPABILITIES & RESILIENCE MIGRATION (PHASE 2)
-- Date: 2026-01-31
-- ============================================

-- 1. Add capabilities to organizations
-- This allows overriding or extending features for specific tenants
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}';

COMMENT ON COLUMN public.organizations.capabilities IS 'Mapa de capacidades (flags booleano) que sobrescriben o extienden las del tier.';

-- 2. Add capabilities to branding_tiers
-- This defines what features a tier unlocks natively
ALTER TABLE public.branding_tiers
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}';

COMMENT ON COLUMN public.branding_tiers.capabilities IS 'Capacidades base que otorga este tier (ej: CAN_CUSTOMIZE_DOMAIN: true).';

-- 3. Initial Soft-Delete support (Recycle Bin prerequisite)
-- Adding deleted_at to core tables
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.billable_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Index for filtering out deleted items
CREATE INDEX IF NOT EXISTS idx_orgs_deleted_at ON public.organizations(deleted_at) WHERE deleted_at IS NULL;

-- 4. Seed initial capabilities for existing tiers
UPDATE public.branding_tiers SET capabilities = '{"CAN_CUSTOMIZE_IDENTITY": true}' WHERE id = 'basic';
UPDATE public.branding_tiers SET capabilities = '{"CAN_CUSTOMIZE_IDENTITY": true, "CAN_CUSTOMIZE_PORTAL": true, "CAN_CUSTOMIZE_DOCUMENTS": true, "CAN_CUSTOMIZE_DOMAIN": true}' WHERE id = 'whitelabel';
