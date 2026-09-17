-- Migration: 20260918000001_add_task_recurrence_and_pacing.sql
-- Description: Add recurrence engine columns and pacing metadata to task_items

-- 1. Add recurrence fields to task_items
ALTER TABLE public.task_items
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS recurrence_interval TEXT CHECK (recurrence_interval IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'yearly')),
    ADD COLUMN IF NOT EXISTS recurrence_day INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS parent_recurring_id UUID REFERENCES public.task_items(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_recurred_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_recurrence_at TIMESTAMPTZ;

-- 2. Create index for fast cron job lookups
CREATE INDEX IF NOT EXISTS idx_task_items_recurrence 
    ON public.task_items(is_recurring, next_recurrence_at) 
    WHERE is_recurring = TRUE;

-- 3. Create index for parent_recurring_id to query all historical cycles
CREATE INDEX IF NOT EXISTS idx_task_items_parent_recurring 
    ON public.task_items(parent_recurring_id);
