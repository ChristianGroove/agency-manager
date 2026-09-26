-- Migration: 20260924000003_add_meeting_activities_and_recurrence_days.sql
-- Description: Add meeting task type, meeting metadata columns, and recurrence_days array to task_items

-- 1. Update task_items_type_check constraint to include 'meeting'
ALTER TABLE public.task_items DROP CONSTRAINT IF EXISTS task_items_type_check;
ALTER TABLE public.task_items ADD CONSTRAINT task_items_type_check 
    CHECK (type IN ('task', 'feature', 'bug', 'improvement', 'delivery', 'meeting'));

-- 2. Add meeting-specific columns to task_items
ALTER TABLE public.task_items
    ADD COLUMN IF NOT EXISTS meeting_modality TEXT CHECK (meeting_modality IN ('virtual', 'in_person', 'hybrid')) DEFAULT 'virtual',
    ADD COLUMN IF NOT EXISTS meeting_url TEXT,
    ADD COLUMN IF NOT EXISTS meeting_location TEXT,
    ADD COLUMN IF NOT EXISTS meeting_start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS meeting_duration_minutes INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS meeting_attendees JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Add recurrence_days for multi-day and business-day patterns (e.g. [1, 2, 3, 4, 5] for Mon-Fri)
ALTER TABLE public.task_items
    ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[] DEFAULT NULL;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_task_items_meeting_start 
    ON public.task_items(meeting_start_at) 
    WHERE type = 'meeting';

CREATE INDEX IF NOT EXISTS idx_task_items_meeting_attendees_gin 
    ON public.task_items USING gin (meeting_attendees jsonb_path_ops) 
    WHERE type = 'meeting';
