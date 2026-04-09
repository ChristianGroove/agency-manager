-- ============================================================================
-- HOSTING ACCOUNTS CLEANUP AND SECURITY HARDENING
-- Run this in Supabase SQL Editor
-- ============================================================================

-- STEP 1: AUDIT - See what we have (RUN THIS FIRST TO UNDERSTAND DATA)
-- ============================================================================
SELECT 
    id,
    organization_id,
    domain_url,
    provider_name,
    plan_name,
    status,
    created_at
FROM hosting_accounts 
ORDER BY organization_id, domain_url;

-- STEP 2: IDENTIFY DUPLICATES
-- ============================================================================
-- Find records with placeholder domain that might be duplicates
SELECT 
    id,
    organization_id,
    domain_url,
    provider_name,
    plan_name,
    client_id,
    COUNT(*) OVER (PARTITION BY organization_id, plan_name, client_id) as dup_count
FROM hosting_accounts 
WHERE domain_url = 'pendiente-dominio.com'
ORDER BY organization_id, plan_name;

-- STEP 3: DELETE DUPLICATES (Keep the one with earliest created_at)
-- ============================================================================
-- First, preview what will be deleted:
WITH ranked AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY organization_id, plan_name, client_id 
            ORDER BY created_at ASC
        ) as rn
    FROM hosting_accounts
    WHERE domain_url = 'pendiente-dominio.com'
)
SELECT * FROM ranked WHERE rn > 1;

-- EXECUTE DELETE (uncomment when ready):
/*
WITH ranked AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY organization_id, plan_name, client_id 
            ORDER BY created_at ASC
        ) as rn
    FROM hosting_accounts
    WHERE domain_url = 'pendiente-dominio.com'
)
DELETE FROM hosting_accounts 
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
*/

-- STEP 4: OPTIONAL - Delete ALL placeholder records (if you want fresh start)
-- ============================================================================
-- CAUTION: Only run if you want to remove all migrated placeholder entries
/*
DELETE FROM hosting_accounts 
WHERE domain_url = 'pendiente-dominio.com' 
  AND provider_name IN ('Migrated Service', 'Migrated Service (Broad)');
*/

-- STEP 5: VERIFY RLS POLICIES ARE CORRECT
-- ============================================================================
SELECT 
    policyname,
    tablename,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'hosting_accounts';

-- STEP 6: STRENGTHEN RLS IF NEEDED (Safe to re-run)
-- ============================================================================
DROP POLICY IF EXISTS "View own hosting accounts" ON hosting_accounts;
DROP POLICY IF EXISTS "Manage own hosting accounts" ON hosting_accounts;

-- Strict SELECT policy - only own organization's records
CREATE POLICY "View own hosting accounts" ON hosting_accounts
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Strict ALL (INSERT/UPDATE/DELETE) policy
CREATE POLICY "Manage own hosting accounts" ON hosting_accounts
    FOR ALL 
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- STEP 7: ADD SERVICE ROLE POLICY FOR ADMIN ACCESS
-- ============================================================================
DROP POLICY IF EXISTS "Service role full access hosting" ON hosting_accounts;
CREATE POLICY "Service role full access hosting" ON hosting_accounts
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- STEP 8: VERIFY FINAL STATE
-- ============================================================================
SELECT 
    organization_id,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE domain_url = 'pendiente-dominio.com') as pending_domains
FROM hosting_accounts 
GROUP BY organization_id;

-- ============================================================================
-- DONE! Your hosting_accounts table is now:
-- 1. Free of duplicates (if you ran step 3 or 4)
-- 2. Protected by strict RLS (tenant isolation)
-- 3. Accessible by service role for server-side operations
-- ============================================================================
