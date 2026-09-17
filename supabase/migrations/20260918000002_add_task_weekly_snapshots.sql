-- Migration: 20260918000002_add_task_weekly_snapshots.sql
ALTER TABLE public.task_items ADD COLUMN IF NOT EXISTS weekly_snapshots JSONB DEFAULT '{}'::jsonb;
