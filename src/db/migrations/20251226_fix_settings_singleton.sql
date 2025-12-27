-- FIX: Remove Single-Tenant Limit on Settings
-- The table has a "singleton_index" that forces only 1 row total.
-- We must remove it to allow 1 row PER ORGANIZATION.

DROP INDEX IF EXISTS public.organization_settings_singleton_idx;

-- Add a unique constraint per organization to ensure 1 row per org
CREATE UNIQUE INDEX IF NOT EXISTS organization_settings_org_idx ON public.organization_settings (organization_id);
