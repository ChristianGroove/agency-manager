-- Fix RLS Policy for Spanish Role Names (Dueño, Administrador)
-- The previous policy only allowed 'Owner' and 'Admin', but migration seeds 'Dueño' and 'Admin'.

-- Re-create the WRITE policies with broader name checks.

DROP POLICY IF EXISTS "manage_org_roles_write" ON public.organization_roles;
DROP POLICY IF EXISTS "manage_org_roles_update" ON public.organization_roles;
DROP POLICY IF EXISTS "manage_org_roles_delete" ON public.organization_roles;

-- Shared logic: User must be Owner/Admin (English or Spanish)

CREATE POLICY "manage_org_roles_write" ON public.organization_roles
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT member.organization_id 
            FROM organization_members member
            LEFT JOIN organization_roles role ON member.role_id = role.id
            WHERE member.user_id = auth.uid() 
            AND (
                -- Legacy
                member.role IN ('owner', 'admin') 
                OR 
                -- RBAC (English + Spanish)
                (role.is_system_role = true AND role.name IN ('Owner', 'Admin', 'Dueño', 'Administrador'))
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
                (role.is_system_role = true AND role.name IN ('Owner', 'Admin', 'Dueño', 'Administrador'))
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
                (role.is_system_role = true AND role.name IN ('Owner', 'Admin', 'Dueño', 'Administrador'))
            )
        )
    );
