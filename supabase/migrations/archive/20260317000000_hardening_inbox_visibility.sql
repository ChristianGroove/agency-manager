-- MIGRATION: 20260317000000_hardening_inbox_visibility.sql
-- Goal: Restrict agents to only see conversations they are assigned to or have explicit channel access for.
-- Admins/Owners continue to see everything.

BEGIN;

-- =============================================================================
-- 1. CONVERSATIONS HARDENING
-- =============================================================================

-- Drop existing legacy policies
DROP POLICY IF EXISTS "conversations_select_by_org" ON "public"."conversations";
DROP POLICY IF EXISTS "Allow select for authenticated users" ON "public"."conversations";

-- Create Hardened Select Policy
CREATE POLICY "conversations_select_hardened" ON "public"."conversations"
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = conversations.organization_id 
    AND om.user_id = auth.uid()
    AND (
      -- A. ROLE BYPASS: Admins/Owners see all org conversations
      om.role IN ('admin', 'owner') 
      -- B. ASSIGNMENT: Agents see what is assigned to them
      OR conversations.assigned_to = auth.uid() 
      -- C. CHANNEL ACCESS: Agents see channels they are authorized for
      OR (
        (om.permissions->'inbox_access')::jsonb ? conversations.connection_id::text
      )
    )
  )
);


-- =============================================================================
-- 2. MESSAGES HARDENING
-- =============================================================================

-- Drop existing legacy policies
DROP POLICY IF EXISTS "messages_select_by_org" ON "public"."messages";
DROP POLICY IF EXISTS "Allow select messages for authenticated users" ON "public"."messages";
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON "public"."messages";

-- Create Hardened Select Policy (Inherits from conversations visibility)
CREATE POLICY "messages_select_hardened" ON "public"."messages"
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
  )
);

-- =============================================================================
-- 3. UPDATE/DELETE HARDENING
-- =============================================================================
-- We should also ensure agents can only UPDATE conversations they can SEE.

DROP POLICY IF EXISTS "conversations_update_by_org" ON "public"."conversations";
CREATE POLICY "conversations_update_hardened" ON "public"."conversations"
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = conversations.organization_id 
    AND om.user_id = auth.uid()
    AND (
      om.role IN ('admin', 'owner') 
      OR conversations.assigned_to = auth.uid() 
      OR ((om.permissions->'inbox_access')::jsonb ? conversations.connection_id::text)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = conversations.organization_id 
    AND om.user_id = auth.uid()
    AND (
      om.role IN ('admin', 'owner') 
      OR conversations.assigned_to = auth.uid() 
      OR ((om.permissions->'inbox_access')::jsonb ? conversations.connection_id::text)
    )
  )
);

COMMIT;
