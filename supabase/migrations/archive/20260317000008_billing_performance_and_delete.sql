-- ========================================================
-- BILLING PERFORMANCE & DELETE CAPABILITIES
-- Date: 2026-03-17
-- ========================================================

-- 1. Performance: Add indices for common lookup and sort patterns
CREATE INDEX IF NOT EXISTS idx_saas_platform_invoices_org_id ON public.saas_platform_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_saas_platform_invoices_created_at ON public.saas_platform_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_platform_invoices_status ON public.saas_platform_invoices(status);

-- 2. Ensure RLS allows deletion for SuperAdmins
-- (The existing "Super admins can manage platform invoices" policy should already cover DELETE if defined for ALL)
-- But let's verify/ensure it:
DROP POLICY IF EXISTS "Super admins can manage platform invoices" ON public.saas_platform_invoices;
CREATE POLICY "Super admins can manage platform invoices"
    ON public.saas_platform_invoices
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'platform_role') = 'super_admin'
    )
    WITH CHECK (
        (auth.jwt() ->> 'platform_role') = 'super_admin'
    );
