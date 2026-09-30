-- Migration: 20260929000002_add_quick_notes_to_task_items.sql
-- Description: Add quick_notes JSONB dictionary to task_items for private/personal notes per collaborator or user

ALTER TABLE public.task_items
    ADD COLUMN IF NOT EXISTS quick_notes JSONB DEFAULT '{}'::jsonb;

-- GIN Index for quick_notes querying
CREATE INDEX IF NOT EXISTS idx_task_items_quick_notes_gin
    ON public.task_items USING gin (quick_notes);
