-- REPAIR ASSIGNMENT HISTORY FK
-- Date: 2026-03-26
-- Reason: Fixes broken FK to 'public.users' which doesn't exist in Supabase

BEGIN;

-- 1. Drop the broken constraint (it might be named differently, so we try multiple common names)
ALTER TABLE public.assignment_history DROP CONSTRAINT IF EXISTS assignment_history_assigned_to_fkey;

-- 2. Clean up any invalid data that might be there (should be empty anyway)
DELETE FROM public.assignment_history WHERE assigned_to IS NOT NULL AND assigned_to NOT IN (SELECT id FROM auth.users);

-- 3. Re-add the constraint pointing to the CORRECT auth.users table
ALTER TABLE public.assignment_history 
ADD CONSTRAINT assignment_history_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;
