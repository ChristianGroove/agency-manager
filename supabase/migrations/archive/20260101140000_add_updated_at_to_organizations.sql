-- ============================================
-- FIX: ADD MISSING UDPATED_AT COLUMN
-- Date: 2026-01-01
-- Purpose: Resolve error "column updated_at of relation organizations does not exist"
-- ============================================

-- 1. Add column if it doesn't exist
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Index (Optional but good for sorting by last update)
CREATE INDEX IF NOT EXISTS idx_organizations_updated_at ON public.organizations(updated_at);

-- 3. Trigger to auto-update (Best Practice)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON COLUMN public.organizations.updated_at IS 'Last update timestamp (auto-managed)';
