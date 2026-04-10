-- DIAGNOSE RLS FOR SPECIFIC USER
-- Replace USER_ID with 'c3b2058f-487c-442f-a9a0-c1c7d3fb0883'

-- 1. Simulate User Session
-- (This only works if you can set local role, but in Supabase SQL Editor you can't easily impersonate for SELECTs without set_config)
-- However, we can call the function directly passing the user ID if we modify the function or just inspect the data it relies on.

-- 2. Verify 'organization_members' for this user
SELECT * 
FROM public.organization_members 
WHERE user_id = 'c3b2058f-487c-442f-a9a0-c1c7d3fb0883'
AND organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2';

-- 3. Check what 'get_auth_org_ids()' would return
-- Since get_auth_org_ids() uses auth.uid(), we can't run it directly here without impersonation.
-- BUT we can look at the definition:
-- RETURN QUERY 
--     SELECT om.organization_id 
--     FROM public.organization_members om 
--     WHERE om.user_id = auth.uid();

-- So effectively we are checking:
SELECT organization_id 
FROM public.organization_members 
WHERE user_id = 'c3b2058f-487c-442f-a9a0-c1c7d3fb0883';

-- 4. Check if the Policy logic holds true
-- Policy: organization_id IN (SELECT get_auth_org_ids())
-- effective check for row in clients:
SELECT count(*) as visible_clients
FROM public.clients
WHERE organization_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = 'c3b2058f-487c-442f-a9a0-c1c7d3fb0883'
);
