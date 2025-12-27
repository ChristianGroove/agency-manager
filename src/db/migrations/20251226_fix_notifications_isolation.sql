-- FIX: Notifications Leak
-- Notifications table is missing organization_id, causing data leaks across tenants.

-- 1. Add organization_id
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 2. Backfill (Optional: Data cleaning)
-- Since we don't know which org a notification belongs to easily without logic, 
-- we might either delete old ones or assign to Tenant Zero.
-- Safest is to Assign to Tenant Zero (Pixy Agency)
DO $$
DECLARE
    tenant_zero_id UUID;
BEGIN
    SELECT id INTO tenant_zero_id FROM public.organizations WHERE slug = 'pixy-agency';
    IF tenant_zero_id IS NOT NULL THEN
        UPDATE public.notifications SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Policy
DROP POLICY IF EXISTS "Tenant Isolation" ON public.notifications;
CREATE POLICY "Tenant Isolation" ON public.notifications
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 5. Fix for 406 Error (Optional but likely related to missing headers/content negotiation)
-- No SQL fix for 406, that's HTTP.
