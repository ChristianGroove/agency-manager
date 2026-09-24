-- Migration: Add task_role column to organization_staff
ALTER TABLE public.organization_staff
ADD COLUMN IF NOT EXISTS task_role text;

-- Backfill support staff
UPDATE public.organization_staff
SET task_role = 'support'
WHERE (role ILIKE '%soport%' OR role ILIKE '%support%' OR role ILIKE '%atenci%');
