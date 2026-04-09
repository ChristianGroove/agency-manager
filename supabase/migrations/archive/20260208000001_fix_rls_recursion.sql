-- Fix RLS Infinite Recursion
-- Problem: 'manage_org_roles' was FOR ALL, so it triggered itself when querying organization_roles inside the USING clause.
-- Solution: Split into SAFE SELECT policy and RESTRICTED WRITE policy.

-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "manage_org_roles" ON public.organization_roles;

-- 2. Ensure we have a safe SELECT policy (Recursion-free)
-- matches existing policy in schema but ensuring it exists
DROP POLICY IF EXISTS "view_org_roles" ON public.organization_roles;
CREATE POLICY "view_org_roles" ON public.organization_roles
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- 3. Create WRITE-ONLY policy (INSERT, UPDATE, DELETE)
-- This will trigger "view_org_roles" for its internal sub-selects, breaking the recursion loop.
CREATE POLICY "manage_org_roles_write" ON public.organization_roles
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT member.organization_id 
            FROM organization_members member
            LEFT JOIN organization_roles role ON member.role_id = role.id
            WHERE member.user_id = auth.uid() 
            AND (
                member.role IN ('owner', 'admin') 
                OR 
                (role.is_system_role = true AND role.name IN ('Owner', 'Admin'))
            )
        )
    );

CREATE POLICY "manage_org_roles_update" ON public.organization_roles
    FOR UPDATE TO authenticated
    USING (
        organization_id IN (
            SELECT member.organization_id 
            FROM organization_members member
            LEFT JOIN organization_roles role ON member.role_id = role.id
            WHERE member.user_id = auth.uid() 
            AND (
                member.role IN ('owner', 'admin') 
                OR 
                (role.is_system_role = true AND role.name IN ('Owner', 'Admin'))
            )
        )
    );

CREATE POLICY "manage_org_roles_delete" ON public.organization_roles
    FOR DELETE TO authenticated
    USING (
        organization_id IN (
            SELECT member.organization_id 
            FROM organization_members member
            LEFT JOIN organization_roles role ON member.role_id = role.id
            WHERE member.user_id = auth.uid() 
            AND (
                member.role IN ('owner', 'admin') 
                OR 
                (role.is_system_role = true AND role.name IN ('Owner', 'Admin'))
            )
        )
    );
