-- =============================================================================
-- RLS AUDIT QUERY: Find Missing Policies
-- =============================================================================
-- Run this in Supabase SQL Editor to find ALL tables that:
-- 1. Have organization_id column (multi-tenant)
-- 2. Are missing SELECT, INSERT, UPDATE, or DELETE policies
-- =============================================================================

-- QUERY 1: Tables with organization_id but missing SELECT policy
SELECT 
    t.table_name,
    'MISSING SELECT POLICY' as issue,
    CASE 
        WHEN rls.relrowsecurity = true THEN 'RLS ENABLED'
        ELSE '⚠️ RLS DISABLED'
    END as rls_status
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
LEFT JOIN pg_class rls ON rls.relname = t.table_name
LEFT JOIN pg_policies p ON p.tablename = t.table_name AND p.cmd = 'SELECT'
WHERE c.column_name = 'organization_id'
  AND c.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND p.policyname IS NULL
ORDER BY t.table_name;

-- QUERY 2: Tables with organization_id but RLS DISABLED entirely
SELECT 
    t.table_name,
    '⚠️ RLS DISABLED - CRITICAL' as issue
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
JOIN pg_class rls ON rls.relname = t.table_name AND rls.relnamespace = 'public'::regnamespace
WHERE c.column_name = 'organization_id'
  AND c.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND rls.relrowsecurity = false
ORDER BY t.table_name;

-- QUERY 3: Complete RLS policy audit for all org-based tables
SELECT 
    t.table_name,
    CASE WHEN sel.policyname IS NOT NULL THEN '✅' ELSE '❌' END as has_select,
    CASE WHEN ins.policyname IS NOT NULL THEN '✅' ELSE '❌' END as has_insert,
    CASE WHEN upd.policyname IS NOT NULL THEN '✅' ELSE '❌' END as has_update,
    CASE WHEN del.policyname IS NOT NULL THEN '✅' ELSE '❌' END as has_delete,
    CASE WHEN rls.relrowsecurity = true THEN '✅' ELSE '❌' END as rls_enabled
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
LEFT JOIN pg_class rls ON rls.relname = t.table_name
LEFT JOIN pg_policies sel ON sel.tablename = t.table_name AND sel.cmd = 'SELECT'
LEFT JOIN pg_policies ins ON ins.tablename = t.table_name AND ins.cmd = 'INSERT'
LEFT JOIN pg_policies upd ON upd.tablename = t.table_name AND upd.cmd = 'UPDATE'
LEFT JOIN pg_policies del ON del.tablename = t.table_name AND del.cmd = 'DELETE'
WHERE c.column_name = 'organization_id'
  AND c.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY 
    CASE WHEN rls.relrowsecurity = false THEN 0 ELSE 1 END,
    CASE WHEN sel.policyname IS NULL THEN 0 ELSE 1 END,
    t.table_name;

-- QUERY 4: Show all existing policies for review
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    LEFT(qual::text, 100) as using_clause_preview
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
