-- Create task_sprints table
CREATE TABLE IF NOT EXISTS public.task_sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.task_workspaces(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.task_projects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    auto_rollover BOOLEAN NOT NULL DEFAULT false,
    duration_days INTEGER NOT NULL DEFAULT 14,
    created_by_staff_id UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Add sprint_id to task_items
ALTER TABLE public.task_items ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES public.task_sprints(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_sprints_org_status ON public.task_sprints(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_task_sprints_dates ON public.task_sprints(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_task_items_sprint ON public.task_items(sprint_id);

-- RLS
ALTER TABLE public.task_sprints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'task_sprints' AND policyname = 'tenant_manage_task_sprints'
  ) THEN
    CREATE POLICY tenant_manage_task_sprints ON public.task_sprints USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_sprints;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END
$$;