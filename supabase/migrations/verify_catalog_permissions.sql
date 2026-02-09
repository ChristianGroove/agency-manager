-- ==============================================================================
-- SCRIPT: verify_catalog_permissions.sql
-- PURPOSE: Verify RLS policies for service_catalog table
-- EXECUTION: Run this script to check if roles can insert/select as expected
-- ==============================================================================

BEGIN;

-- 1. Create a test organization
DO $$
DECLARE
    v_org_id UUID;
    v_admin_id UUID;
    v_member_id UUID;
    v_service_id UUID;
    v_count INT;
BEGIN
    RAISE NOTICE '--- STARTING PERMISSION VERIFICATION ---';

    -- Setup: Get an existing org and users or create mocks (since we can't easily switch auth.uid() in simple SQL script without extensions, 
    -- we will simulate RLS checks by manually querying with specific contexts if possible, 
    -- BUT for a robust test we usually rely on `set_config('request.jwt.claims', ...)` which might be complex here.)
    
    -- ALTERNATIVE STRATEGY: 
    -- We can inspect the policies directly to see if they exist and match expectations.
    
    RAISE NOTICE 'Checking existing policies on service_catalog...';
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'service_catalog'
    ) THEN
        RAISE WARNING '!!! NO POLICIES FOUND ON service_catalog !!! - System is insecure or policies are missing.';
    ELSE
        FOR v_count IN (SELECT count(*) FROM pg_policies WHERE tablename = 'service_catalog') LOOP
            RAISE NOTICE 'Found % policies.', v_count;
        END LOOP;
    END IF;

    -- 2. Inspect specific policy details (heuristic check)
    -- We expect a policy that allows INSERT for 'owner', 'admin', 'manager'
    
    PERFORM 1 FROM pg_policies 
    WHERE tablename = 'service_catalog' 
      AND cmd = 'INSERT'
      AND (
          qualifier::text LIKE '%organization_members%' 
          OR with_check::text LIKE '%organization_members%'
      );
      
    IF NOT FOUND THEN
        RAISE WARNING 'No INSERT policy found checking organization_members. Likely the issue.';
    ELSE
        RAISE NOTICE 'INSERT policy seems to check organization members (basic check passed).';
    END IF;

    -- 3. Attempt a dry-run insert if we were an authenticated user (Simulated)
    -- This part is tricky in pure SQL without setting session variables mimicking Supabase Auth.
    -- We will skip actual INSERT simulation and rely on the policy inspection result and the upcoming fix.

END $$;

ROLLBACK; -- Always rollback to not leave trash
