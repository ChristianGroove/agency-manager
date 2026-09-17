-- Migration: 20260916000001_create_task_workspaces_and_hierarchy.sql
-- Description: Create task_workspaces (parent spaces) and link task_projects (child projects) to establish workspace hierarchy

-- 1. Create task_workspaces table
CREATE TABLE IF NOT EXISTS public.task_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#0284c7',
    icon TEXT DEFAULT 'Globe',
    lead_staff_id UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_task_workspaces_org_slug UNIQUE(organization_id, slug),
    CONSTRAINT uq_task_workspaces_org_prefix UNIQUE(organization_id, key_prefix)
);

-- 2. Add workspace_id column to task_projects if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'task_projects' 
        AND column_name = 'workspace_id'
    ) THEN 
        ALTER TABLE public.task_projects 
        ADD COLUMN workspace_id UUID REFERENCES public.task_workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_task_workspaces_org ON public.task_workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_projects_workspace ON public.task_projects(workspace_id);

-- 4. Enable RLS and create policy
ALTER TABLE public.task_workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_manage_task_workspaces" ON public.task_workspaces;
CREATE POLICY "tenant_manage_task_workspaces" ON public.task_workspaces
    FOR ALL
    USING (true)
    WITH CHECK (true);
