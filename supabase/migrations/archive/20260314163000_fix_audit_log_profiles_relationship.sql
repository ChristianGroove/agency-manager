-- MIGRATION: 20260314163000_fix_audit_log_profiles_relationship.sql
-- OBJECTIVE: Add explicit foreign key from organization_audit_log(performed_by) to public.profiles(id)
-- REASON: Enable Supabase PostgREST to automatically resolve joins for the admin dashboard.

-- Ensure the relationship exists for PostgREST
ALTER TABLE public.organization_audit_log
DROP CONSTRAINT IF EXISTS organization_audit_log_performed_by_profiles_fkey;

ALTER TABLE public.organization_audit_log
ADD CONSTRAINT organization_audit_log_performed_by_profiles_fkey
FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Log success
DO $$
BEGIN
    RAISE NOTICE '✅ Relationship fixed: organization_audit_log(performed_by) -> profiles(id)';
END $$;
