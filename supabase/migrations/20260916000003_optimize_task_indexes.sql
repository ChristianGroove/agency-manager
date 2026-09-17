-- Migration: 20260916000003_optimize_task_indexes.sql
-- Description: Composite and high-performance indexes for task_items, task_comments and task_projects to eliminate sequential scans and in-memory quicksorts.

-- 1. Composite index for default task listing and ordering: WHERE organization_id = $1 ORDER BY order_index ASC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_task_items_org_order 
ON public.task_items(organization_id, order_index ASC, created_at DESC);

-- 2. Composite index for project-scoped tasks: WHERE organization_id = $1 AND project_id = $2
CREATE INDEX IF NOT EXISTS idx_task_items_org_project 
ON public.task_items(organization_id, project_id, order_index ASC);

-- 3. Composite index for status filtering: WHERE organization_id = $1 AND status = $2
CREATE INDEX IF NOT EXISTS idx_task_items_org_status 
ON public.task_items(organization_id, status);

-- 4. Composite index for collaborator assignment: WHERE organization_id = $1 AND assigned_staff_id = $2
CREATE INDEX IF NOT EXISTS idx_task_items_org_assigned 
ON public.task_items(organization_id, assigned_staff_id);

-- 5. Index for ticket code lookups: WHERE organization_id = $1 AND ticket_code = $2
CREATE INDEX IF NOT EXISTS idx_task_items_org_ticket_code 
ON public.task_items(organization_id, ticket_code);

-- 6. Index for comments ordering by task: WHERE task_id = $1 ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS idx_task_comments_task_created 
ON public.task_comments(task_id, created_at ASC);
