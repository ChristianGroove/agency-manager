-- ==============================================================================
-- MIGRATION: fix_service_catalog_rls
-- PURPOSE: Fix RLS policies for service_catalog to allow proper management
-- EXECUTION: Run via Supabase migration tool or SQL editor
-- ==============================================================================

-- 1. Ensure RLS is enabled
ALTER TABLE IF EXISTS public.service_catalog ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Service catalog viewable by organization members" ON public.service_catalog;
DROP POLICY IF EXISTS "Service catalog editable by organization admins" ON public.service_catalog;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.service_catalog;
DROP POLICY IF EXISTS "Enable insert for organization admins" ON public.service_catalog;
DROP POLICY IF EXISTS "Enable update for organization admins" ON public.service_catalog;
DROP POLICY IF EXISTS "Enable delete for organization admins" ON public.service_catalog;

-- Cleanup potential previous runs of this fix
DROP POLICY IF EXISTS "view_service_catalog" ON public.service_catalog;
DROP POLICY IF EXISTS "manage_service_catalog" ON public.service_catalog;

-- 3. Create new policies

-- POLICY: VIEW (SELECT)
-- All members of an organization can view the catalog of that organization.
CREATE POLICY "view_service_catalog"
ON public.service_catalog
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid()
    )
);

-- POLICY: MANAGE (INSERT, UPDATE, DELETE)
-- Only 'owner', 'admin', and 'manager' roles can modify the catalog.
-- We use a single policy for ALL modification actions if possible, but standard RLS is usually per command or ALL.
-- Let's stick to separate policies for clarity or ALL if the logic is identical.
-- The logic IS identical for INSERT, UPDATE, DELETE.

CREATE POLICY "manage_service_catalog"
ON public.service_catalog
FOR ALL 
USING (
    organization_id IN (
        SELECT member.organization_id 
        FROM public.organization_members member
        LEFT JOIN public.organization_roles role ON member.role_id = role.id
        WHERE member.user_id = auth.uid()
        AND (
            member.role IN ('owner', 'admin', 'manager')
            OR
            (role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador'))
        )
    )
)
WITH CHECK (
    organization_id IN (
        SELECT member.organization_id 
        FROM public.organization_members member
        LEFT JOIN public.organization_roles role ON member.role_id = role.id
        WHERE member.user_id = auth.uid()
        AND (
            member.role IN ('owner', 'admin', 'manager')
            OR
            (role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador'))
        )
    )
);

-- 4. Verification (Optional comment)
COMMENT ON TABLE public.service_catalog IS 'Service Catalog with strict RLS: View for all members, Manage for Admins/Managers.';
