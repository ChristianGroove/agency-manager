-- Migration: 20260918000003_add_task_blocked_by.sql
-- Description: Add blocked_by_task_id foreign key to task_items for bottleneck dependency tracking

ALTER TABLE public.task_items
ADD COLUMN IF NOT EXISTS blocked_by_task_id UUID REFERENCES public.task_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_task_items_blocked_by ON public.task_items(blocked_by_task_id);