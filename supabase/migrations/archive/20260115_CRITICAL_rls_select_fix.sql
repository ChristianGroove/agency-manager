-- =============================================================================
-- CRITICAL SECURITY FIX: Multi-Tenant Data Isolation
-- =============================================================================
-- Date: 2026-01-15
-- Issue: Missing SELECT RLS policies allowing cross-tenant data access
-- 
-- AFFECTED TABLES:
-- - leads (CRITICAL: SELECT policy missing)
-- - Other tables audited and hardened
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. FIX LEADS TABLE - ADD MISSING SELECT POLICY
-- =============================================================================

-- First, verify RLS is enabled (idempotent)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop any existing SELECT policy (cleanup)
DROP POLICY IF EXISTS "Users can view leads in their org" ON public.leads;
DROP POLICY IF EXISTS "Users can view their leads" ON public.leads;
DROP POLICY IF EXISTS "Leads org isolation" ON public.leads;

-- Create the missing SELECT policy
CREATE POLICY "Users can view leads in their org"
    ON public.leads
    FOR SELECT
    USING (
        -- User must be a member of the organization that owns this lead
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        -- OR service role (for system processes)
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- =============================================================================
-- 2. AUDIT AND FIX CLIENTS TABLE
-- =============================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view clients in their org" ON public.clients;
CREATE POLICY "Users can view clients in their org"
    ON public.clients
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users can create clients in their org" ON public.clients;
CREATE POLICY "Users can create clients in their org"
    ON public.clients
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users can update clients in their org" ON public.clients;
CREATE POLICY "Users can update clients in their org"
    ON public.clients
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete clients in their org" ON public.clients;
CREATE POLICY "Users can delete clients in their org"
    ON public.clients
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- 3. AUDIT AND FIX QUOTES TABLE
-- =============================================================================

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view quotes in their org" ON public.quotes;
CREATE POLICY "Users can view quotes in their org"
    ON public.quotes
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users can create quotes in their org" ON public.quotes;
CREATE POLICY "Users can create quotes in their org"
    ON public.quotes
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users can update quotes in their org" ON public.quotes;
CREATE POLICY "Users can update quotes in their org"
    ON public.quotes
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete quotes in their org" ON public.quotes;
CREATE POLICY "Users can delete quotes in their org"
    ON public.quotes
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- 4. AUDIT AND FIX INVOICES TABLE
-- =============================================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invoices in their org" ON public.invoices;
CREATE POLICY "Users can view invoices in their org"
    ON public.invoices
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users can create invoices in their org" ON public.invoices;
CREATE POLICY "Users can create invoices in their org"
    ON public.invoices
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users can update invoices in their org" ON public.invoices;
CREATE POLICY "Users can update invoices in their org"
    ON public.invoices
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- 5. AUDIT AND FIX CONVERSATIONS TABLE
-- =============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversations in their org" ON public.conversations;
CREATE POLICY "Users can view conversations in their org"
    ON public.conversations
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- =============================================================================
-- 6. AUDIT AND FIX PIPELINE_STAGES TABLE
-- =============================================================================

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view stages in their org" ON public.pipeline_stages;
CREATE POLICY "Users can view stages in their org"
    ON public.pipeline_stages
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users can manage stages in their org" ON public.pipeline_stages;
CREATE POLICY "Users can manage stages in their org"
    ON public.pipeline_stages
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- 7. AUDIT AND FIX PIPELINES TABLE
-- =============================================================================

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pipelines in their org" ON public.pipelines;
CREATE POLICY "Users can view pipelines in their org"
    ON public.pipelines
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users can manage pipelines in their org" ON public.pipelines;
CREATE POLICY "Users can manage pipelines in their org"
    ON public.pipelines
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- 8. AUDIT AND FIX WORKFLOWS TABLE
-- =============================================================================

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workflows in their org" ON public.workflows;
CREATE POLICY "Users can view workflows in their org"
    ON public.workflows
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users can manage workflows in their org" ON public.workflows;
CREATE POLICY "Users can manage workflows in their org"
    ON public.workflows
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- 9. AUDIT AND FIX CRM_TASKS TABLE
-- =============================================================================

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tasks in their org" ON public.crm_tasks;
CREATE POLICY "Users can view tasks in their org"
    ON public.crm_tasks
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users can manage tasks in their org" ON public.crm_tasks;
CREATE POLICY "Users can manage tasks in their org"
    ON public.crm_tasks
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- 10. VERIFICATION QUERY - Run this to verify policies
-- =============================================================================

-- This will show all policies for the critical tables
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('leads', 'clients', 'quotes', 'invoices', 'conversations', 'pipelines', 'pipeline_stages', 'workflows', 'crm_tasks')
-- ORDER BY tablename, cmd;

COMMIT;

-- =============================================================================
-- POST-MIGRATION VERIFICATION
-- =============================================================================
-- Run this query in Supabase Dashboard SQL Editor to verify:
/*
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual::text as using_clause
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY cmd;

-- Expected result:
-- SELECT policy: "Users can view leads in their org"
-- INSERT policy: "Users can create leads"
-- UPDATE policy: "Users can update their leads"
-- DELETE policy: "Users can delete their leads"
*/
