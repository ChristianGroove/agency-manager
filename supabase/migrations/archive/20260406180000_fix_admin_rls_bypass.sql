-- MIGRATION: 20260406180000_fix_admin_rls_bypass.sql
-- Goal: Remove the hardcoded 'admin' bypass from RLS policies.
-- Now, only 'owner' has total organization-level bypass.
-- Admins will only see what is assigned to them or explicitly authorized in their 'inbox_access' permissions.

BEGIN;

-- =============================================================================
-- 1. CONVERSATIONS RLS ENFORCEMENT
-- =============================================================================

-- Drop the previous hardened policy to replace it
DROP POLICY IF EXISTS "conversations_select_hardened" ON "public"."conversations";

-- Create the DEFINITIVE Select Policy
CREATE POLICY "conversations_select_hardened" ON "public"."conversations"
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = conversations.organization_id 
    AND om.user_id = auth.uid()
    AND (
      -- A. OWNER BYPASS: Only Owners (Hierarchy 100) see all conversations
      om.role = 'owner'
      -- B. ASSIGNMENT: See what is assigned to them
      OR conversations.assigned_to = auth.uid() 
      -- C. CHANNEL ACCESS: See authorized channels (Deep Mapping in JSON)
      OR (
        (om.permissions->'inbox_access')::jsonb ? conversations.connection_id::text
        OR (om.permissions->'modules'->'inbox'->'inbox_access')::jsonb ? conversations.connection_id::text
      )
    )
  )
);

-- Drop and Replace Update Policy
DROP POLICY IF EXISTS "conversations_update_hardened" ON "public"."conversations";
CREATE POLICY "conversations_update_hardened" ON "public"."conversations"
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = conversations.organization_id 
    AND om.user_id = auth.uid()
    AND (
      om.role = 'owner'
      OR conversations.assigned_to = auth.uid() 
      OR ((om.permissions->'inbox_access')::jsonb ? conversations.connection_id::text)
      OR ((om.permissions->'modules'->'inbox'->'inbox_access')::jsonb ? conversations.connection_id::text)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = conversations.organization_id 
    AND om.user_id = auth.uid()
    AND (
      om.role = 'owner'
      OR conversations.assigned_to = auth.uid() 
      OR ((om.permissions->'inbox_access')::jsonb ? conversations.connection_id::text)
      OR ((om.permissions->'modules'->'inbox'->'inbox_access')::jsonb ? conversations.connection_id::text)
    )
  )
);

-- =============================================================================
-- 2. MESSAGES ENFORCEMENT (Inherited)
-- =============================================================================
-- No changes needed as it inherits from conversations select policy.

COMMIT;
