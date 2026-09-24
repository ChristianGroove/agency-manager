-- 20260924000001_add_parallel_teams_support.sql
-- Description: Enable parallel teams and support ticket channel

-- 1. Workspace-level plug and play toggle & support configuration (SLA, dynamic fields)
ALTER TABLE public.task_workspaces 
ADD COLUMN IF NOT EXISTS parallel_team_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.task_workspaces 
ADD COLUMN IF NOT EXISTS support_config JSONB DEFAULT '{}';

-- 2. Ticket origin type and bidirectional promotion traceability
ALTER TABLE public.task_items 
ADD COLUMN IF NOT EXISTS origin_type TEXT DEFAULT 'internal'
CHECK (origin_type IN ('internal', 'support'));

ALTER TABLE public.task_items 
ADD COLUMN IF NOT EXISTS promoted_from_id UUID REFERENCES public.task_items(id) ON DELETE SET NULL;

-- 3. Partial index for efficient filtering of support tickets
CREATE INDEX IF NOT EXISTS idx_task_items_origin_type 
ON public.task_items (organization_id, origin_type) 
WHERE origin_type = 'support';

-- 4. Partial index for promotion traceability lookups
CREATE INDEX IF NOT EXISTS idx_task_items_promoted_from 
ON public.task_items (promoted_from_id) 
WHERE promoted_from_id IS NOT NULL;
