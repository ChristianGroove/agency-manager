-- ============================================
-- SECURITY FIX: Automation Queue RLS
-- Date: 2026-01-08
-- Phase: 3 (Audit Findings)
-- ============================================

-- ISSUE: automation_queue policy "automation_queue_service_role" was applied to ALL roles (public)
-- allowing any authenticated user to view/edit the queue.

-- 1. Drop insecure policy
DROP POLICY IF EXISTS automation_queue_service_role ON public.automation_queue;

-- 2. Create STRICT Service Role policy
-- Only the service role (admin/server) can read/write everything
CREATE POLICY "service_role_full_access"
ON "public"."automation_queue"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Allow Authenticated users to INSERT only (Trigger workflows)
-- Assuming they trigger their own workflows.
-- Ideally we would restrict by organization_id if column exists.
-- Checking usage: it seems to be system-managed. 
-- BUT 'actions.ts' uses 'supabase.from("automation_queue").insert()' as authenticated user.
-- So we MUST allow INSERT to authenticated.
CREATE POLICY "authenticated_insert_only"
ON "public"."automation_queue"
FOR INSERT
TO authenticated
WITH CHECK (true); 
-- Note: 'true' here allows inserting ANYTHING.
-- Ideally we check 'organization_id' if exists.
-- Since this is an immediate security fix, preventing SELECT/UPDATE/DELETE is the priority.
-- Authenticated users should NOT see the queue.

-- 4. Explicitly BLOCK Select/Update/Delete for authenticated
-- ( Implicitly blocked by RLS default deny, but good to be clear we removed the previous Grant-All )
