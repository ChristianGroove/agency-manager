-- FIX: User Deletion Integrity
-- Description: Updates Foreign Key constraints to use ON DELETE CASCADE, 
-- allowing users to be deleted from auth.users without being blocked by 
-- dependent records in system_alerts, organizations, or audit logs.
-- Reason: Clean architectural fix to avoid technical debt and manual cleanup.

-- 1. Fix system_alerts (created_by)
ALTER TABLE public.system_alerts 
DROP CONSTRAINT IF EXISTS system_alerts_created_by_fkey;

ALTER TABLE public.system_alerts 
ADD CONSTRAINT system_alerts_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Fix organizations (owner_id)
-- Note: We use SET NULL here because an organization shouldn't necessarily 
-- be deleted if its initial owner is deleted (it might have other members).
ALTER TABLE public.organizations 
DROP CONSTRAINT IF EXISTS organizations_owner_id_fkey;

ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Fix organization_audit_log (performed_by)
ALTER TABLE public.organization_audit_log 
DROP CONSTRAINT IF EXISTS organization_audit_log_performed_by_fkey;

ALTER TABLE public.organization_audit_log 
ADD CONSTRAINT organization_audit_log_performed_by_fkey 
FOREIGN KEY (performed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
