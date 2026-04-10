-- 🔍 verify_security_baseline.sql
-- Run this in Supabase SQL Editor to audit current RLS state.

WITH rls_audit AS (
    SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive, 
        cmd, 
        qual, 
        with_check
    FROM pg_policies 
    WHERE schemaname = 'public'
)
SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual ILIKE '%true%' OR with_check ILIKE '%true%' THEN '⚠️ POTENTIAL LEAK (Open Door)'
        WHEN qual ILIKE '%organization_id%' OR qual ILIKE '%organization_members%' THEN '✅ ISOLATED'
        ELSE 'ℹ️ OTHER / SYSTEM'
    END as status,
    qual as using_expression
FROM rls_audit
ORDER BY tablename, operation;

-- 🚨 CRITICAL TABLES CHECK
-- These tables MUST NOT have "true" policies for non-admin users.
SELECT 'CHECKING SENSITIVE TABLES...' as diagnostic;

SELECT 
    tablename, 
    policyname, 
    qual 
FROM pg_policies 
WHERE tablename IN (
    'payment_transactions', 
    'payment_gateway_config', 
    'organization_settings', 
    'organization_smtp_configs',
    'emitters',
    'leads'
) AND (qual ILIKE '%true%' OR qual IS NULL);
