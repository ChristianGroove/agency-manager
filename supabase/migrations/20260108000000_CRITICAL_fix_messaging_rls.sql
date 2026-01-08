-- MIGRATION: 20260108000000_CRITICAL_fix_messaging_rls.sql
-- FIX: Messaging RLS Isolation
-- CLEANUP FIRST:

-- 1. Drop ALL policies explicitly (Old and potentially orphan New ones)
DROP POLICY IF EXISTS "Allow select for authenticated users" ON "public"."conversations";
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."conversations";
DROP POLICY IF EXISTS "Allow update for authenticated users" ON "public"."conversations";
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON "public"."conversations";

DROP POLICY IF EXISTS "Allow select messages for authenticated users" ON "public"."messages";
DROP POLICY IF EXISTS "Allow insert messages for authenticated users" ON "public"."messages";
DROP POLICY IF EXISTS "Allow update messages for authenticated users" ON "public"."messages";
DROP POLICY IF EXISTS "Allow delete messages for authenticated users" ON "public"."messages";

-- Clean up any failed implementation attempts
DROP POLICY IF EXISTS "conversations_select_by_org" ON "public"."conversations";
DROP POLICY IF EXISTS "conversations_insert_by_org" ON "public"."conversations";
DROP POLICY IF EXISTS "conversations_update_by_org" ON "public"."conversations";
DROP POLICY IF EXISTS "conversations_delete_by_org" ON "public"."conversations";

DROP POLICY IF EXISTS "messages_select_by_org" ON "public"."messages";
DROP POLICY IF EXISTS "messages_insert_by_org" ON "public"."messages";
DROP POLICY IF EXISTS "messages_update_by_org" ON "public"."messages";
DROP POLICY IF EXISTS "messages_delete_by_org" ON "public"."messages";

-- 2. Create CONVERSATIONS policies
CREATE POLICY "conversations_select_by_org" ON "public"."conversations"
FOR SELECT TO authenticated USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "conversations_insert_by_org" ON "public"."conversations"
FOR INSERT TO authenticated WITH CHECK (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "conversations_update_by_org" ON "public"."conversations"
FOR UPDATE TO authenticated USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
) WITH CHECK (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "conversations_delete_by_org" ON "public"."conversations"
FOR DELETE TO authenticated USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- 3. Create MESSAGES policies
CREATE POLICY "messages_select_by_org" ON "public"."messages"
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = messages.conversation_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert_by_org" ON "public"."messages"
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = messages.conversation_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "messages_update_by_org" ON "public"."messages"
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = messages.conversation_id AND om.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = messages.conversation_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "messages_delete_by_org" ON "public"."messages"
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = messages.conversation_id AND om.user_id = auth.uid()
  )
);
