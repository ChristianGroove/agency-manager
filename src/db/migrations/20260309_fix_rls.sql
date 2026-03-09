-- 1. SAAS_APPS RLS (Enable read for all authenticated)
ALTER TABLE public.saas_apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view saas_apps" ON public.saas_apps;
CREATE POLICY "All authenticated can view saas_apps" ON public.saas_apps
    FOR SELECT TO authenticated
    USING (true);

-- 2. SAAS_SUBSCRIPTIONS RLS (Reforce SuperAdmin access)
-- Ensure SuperAdmins can see everything even if they aren't members
DROP POLICY IF EXISTS "SuperAdmins full access" ON public.saas_subscriptions;
CREATE POLICY "SuperAdmins full access" ON public.saas_subscriptions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.platform_role = 'super_admin'
        )
    );

-- Ensure Org Admins can see their own
DROP POLICY IF EXISTS "Admins can view their organization subscription" ON public.saas_subscriptions;
CREATE POLICY "Admins can view their organization subscription" ON public.saas_subscriptions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = saas_subscriptions.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );
