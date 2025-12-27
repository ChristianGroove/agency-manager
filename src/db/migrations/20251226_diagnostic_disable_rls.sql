-- DIAGNOSTIC: Disable RLS on Organization Members
-- This confirms if the issue is indeed Infinite Recursion.
-- Run this. If the logout issue STOPS, then our RLS policies are still recursive.

ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- Also disable on Organizations to be sure
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
