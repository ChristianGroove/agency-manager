-- Migration: 20260916000002_create_task_workspace_members.sql
-- Description: Create task_workspace_members table for granular workspace access control and add has_global_workspace_access to organization_staff

-- 1. Add has_global_workspace_access to organization_staff
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_staff' 
        AND column_name = 'has_global_workspace_access'
    ) THEN 
        ALTER TABLE public.organization_staff 
        ADD COLUMN has_global_workspace_access BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 2. Create task_workspace_members junction table
CREATE TABLE IF NOT EXISTS public.task_workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.task_workspaces(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member')),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_task_workspace_members UNIQUE(workspace_id, staff_id)
);

-- 3. Indexes for instant lookup and joins
CREATE INDEX IF NOT EXISTS idx_task_workspace_members_org ON public.task_workspace_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_workspace_members_ws ON public.task_workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_workspace_members_staff ON public.task_workspace_members(staff_id);

-- 4. Enable RLS and policies
ALTER TABLE public.task_workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS  tenant_manage_task_workspace_members ON public.task_workspace_members;
CREATE POLICY tenant_manage_task_workspace_members ON public.task_workspace_members
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Backfill: Seed workspace members from leads and task assignments
-- A. Leads of workspaces
INSERT INTO public.task_workspace_members (organization_id, workspace_id, staff_id, role)
SELECT 
    w.organization_id,
    w.id AS workspace_id,
    w.lead_staff_id AS staff_id,
    'lead' AS role
FROM public.task_workspaces w
WHERE w.lead_staff_id IS NOT NULL
ON CONFLICT (workspace_id, staff_id) DO NOTHING;

-- B. Staff with tasks in projects belonging to workspaces
INSERT INTO public.task_workspace_members (organization_id, workspace_id, staff_id, role)
SELECT DISTINCT
    t.organization_id,
    p.workspace_id,
    t.assigned_staff_id AS staff_id,
    'member' AS role
FROM public.task_items t
JOIN public.task_projects p ON t.project_id = p.id
WHERE p.workspace_id IS NOT NULL 
  AND t.assigned_staff_id IS NOT NULL
ON CONFLICT (workspace_id, staff_id) DO NOTHING;
