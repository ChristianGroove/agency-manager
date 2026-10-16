-- Migration: 20261016000000_harden_task_management_rls.sql
-- Description: Harden task management RLS policies from permissive USING (true) to strict tenant-isolated checks.

-- 1. Drop overly permissive policies
DROP POLICY IF EXISTS "tenant_manage_task_projects" ON public.task_projects;
DROP POLICY IF EXISTS "tenant_manage_task_items" ON public.task_items;
DROP POLICY IF EXISTS "tenant_manage_task_comments" ON public.task_comments;
DROP POLICY IF EXISTS "tenant_manage_task_project_members" ON public.task_project_members;

-- 2. Create tenant-isolated RLS policies for task_projects
CREATE POLICY "tenant_manage_task_projects" ON public.task_projects
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- 3. Create tenant-isolated RLS policies for task_items
CREATE POLICY "tenant_manage_task_items" ON public.task_items
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- 4. Create tenant-isolated RLS policies for task_comments
CREATE POLICY "tenant_manage_task_comments" ON public.task_comments
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- 5. Create tenant-isolated RLS policies for task_project_members
CREATE POLICY "tenant_manage_task_project_members" ON public.task_project_members
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );
