-- Migration: Optimize Messages RLS for Realtime
-- Description: Denormalizes organization_id to messages table to allow O(1) RLS checks
-- Author: Antigravity
-- Date: 2026-01-22

BEGIN;

-- 1. Add Column (Nullable initially for backfill)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 2. Backfill existing messages
-- Fetch organization_id from parent conversation
UPDATE messages m
SET organization_id = c.organization_id
FROM conversations c
WHERE m.conversation_id = c.id
AND m.organization_id IS NULL;

-- 3. Enforce Not Null
-- NOTE: If this fails, it means some messages have orphaned conversations. 
-- We delete them or leave null depending on strictness. Here we assume integrity.
ALTER TABLE messages ALTER COLUMN organization_id SET NOT NULL;

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(organization_id);

-- 5. Trigger Function to Auto-Fill Organization ID
-- This ensures backward compatibility with code that inserts calls without org_id
CREATE OR REPLACE FUNCTION public.set_message_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM conversations
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger Definition
DROP TRIGGER IF EXISTS trigger_set_message_org ON messages;
CREATE TRIGGER trigger_set_message_org
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION public.set_message_organization_id();

-- 7. Optimize RLS Policies
-- Drop potential old policies (names gathered from greps/audit)
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "Users can view messages from accessible conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to accessible conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in accessible conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages from their organization" ON messages;

-- Create new "Flat" policies (FAST)
CREATE POLICY "messages_select_policy_optimized"
ON messages FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert_policy_optimized"
ON messages FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "messages_update_policy_optimized"
ON messages FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- 8. Add to Realtime Publication (Idempotent Check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

COMMIT;
