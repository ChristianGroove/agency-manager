-- Migration: 20260919000001_add_task_blocked_reason.sql
-- Description: Add optional blocked_reason text column to task_items for tracking why a ticket is blocked

ALTER TABLE public.task_items
ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
