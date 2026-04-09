-- Fix RLS Policy for Organization Roles to respect RBAC role_id
-- Previous policy only checked legacy 'role' column which is often 'member' for Owners in new system.

DROP POLICY IF EXISTS "manage_org_roles" ON public.organization_roles;

CREATE POLICY "manage_org_roles" ON public.organization_roles
    FOR ALL TO authenticated
    USING (
        organization_id IN (
            SELECT member.organization_id 
            FROM organization_members member
            LEFT JOIN organization_roles role ON member.role_id = role.id
            WHERE member.user_id = auth.uid() 
            AND (
                -- Legacy Check (for bootstrap)
                member.role IN ('owner', 'admin') 
                OR 
                -- RBAC Check (System Roles)
                (role.is_system_role = true AND role.name IN ('Owner', 'Admin'))
            )
        )
    );
