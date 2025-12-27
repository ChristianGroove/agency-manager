-- NUCLEAR DIAGNOSTIC: DISABLE RLS
-- Run this to confirm if RLS is the cause of the crashes/logouts.
-- If the app works after running this, we KNOW 100% the issue is the Policy logic.

BEGIN;

-- 1. Disable RLS on Organization Members (The usual suspect)
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on Organizations (Just in case)
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- 3. Disable RLS on Settings (To be safe)
ALTER TABLE public.organization_settings DISABLE ROW LEVEL SECURITY;

COMMIT;

-- NOW TRY TO SWITCH ORGANIZATIONS.
-- If it works, tell me "IT WORKS".
-- Then I will give you the SECURE fix.
