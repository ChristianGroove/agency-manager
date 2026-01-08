-- ============================================
-- DIAGNOSTIC: Check Current RLS Policies
-- Run this BEFORE the migration to see what exists
-- ============================================

-- 1. Check all policies on conversations table
SELECT 
    policyname,
    cmd,
    qual AS using_expression,
    with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
ORDER BY policyname;

-- 2. Check all policies on messages table
SELECT 
    policyname,
    cmd,
    qual AS using_expression,
    with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'messages'
ORDER BY policyname;

-- 3. Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'messages');

-- 4. Summary: Count policies per table
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'messages')
GROUP BY tablename;
