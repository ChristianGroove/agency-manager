-- ============================================
-- GLOBAL SECURITY AUDIT: DATA ISOLATION
-- Date: 2026-01-01
-- Purpose: Enforce strict RLS on all core modules
-- ============================================

-- 1. SECURE ORGANIZATIONS (ROOT ISOLATION)
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_isolation_policy" ON public.organizations;

CREATE POLICY "organizations_isolation_policy" ON public.organizations
    USING (
        (auth.jwt() ->> 'platform_role' = 'super_admin') OR
        (id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        ))
    )
    WITH CHECK (
        (auth.jwt() ->> 'platform_role' = 'super_admin') OR
        (id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        ))
    );

-- 2. SECURE CLIENTS (CRM)
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_isolation_policy" ON public.clients;

CREATE POLICY "clients_isolation_policy" ON public.clients
    USING (
        (auth.jwt() ->> 'platform_role' = 'super_admin') OR
        (organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        ))
    )
    WITH CHECK (
        (auth.jwt() ->> 'platform_role' = 'super_admin') OR
        (organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        ))
    );

-- 3. SECURE SAAS PRODUCTS (CONFIGURATIONS)
ALTER TABLE IF EXISTS public.organization_saas_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_saas_isolation" ON public.organization_saas_products;

CREATE POLICY "org_saas_isolation" ON public.organization_saas_products
    USING (
        (auth.jwt() ->> 'platform_role' = 'super_admin') OR
        (organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        ))
    );

-- 4. SECURE ORGANIZATION DOMAINS (Uses Organizations table, covered by #1)
-- Validation: Domains are columns on 'organizations', so policy #1 covers 'organization_domains'.

-- 5. SECURE SYSTEM MODULES (CATALOG)
ALTER TABLE IF EXISTS public.system_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_read_policy" ON public.system_modules;

-- Everyone can read the catalog, but only super admin can modify (if policy existed for modification)
CREATE POLICY "modules_read_policy" ON public.system_modules
    FOR SELECT TO authenticated
    USING (true); -- Public catalog

-- Log success
DO $$
BEGIN
    RAISE NOTICE '✅ GLOBAL SECURITY AUDIT COMPLETE: RLS Enforced on Organizations, Clients, SaaS, Modules';
END $$;
