-- SIMPLIFIED RLS FOR MESSAGES
-- Use a simpler approach that joins directly instead of subqueries

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view messages from their organization" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to their organization's conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their organization" ON messages;

-- Create helper function to check if user belongs to conversation's organization
CREATE OR REPLACE FUNCTION user_can_access_conversation(conv_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversations c
    INNER JOIN organization_members om ON om.organization_id = c.organization_id
    WHERE c.id = conv_id
    AND om.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simpler policies using the helper function
CREATE POLICY "Users can view messages from accessible conversations"
    ON messages
    FOR SELECT
    USING (user_can_access_conversation(conversation_id));

CREATE POLICY "Users can insert messages to accessible conversations"
    ON messages
    FOR INSERT
    WITH CHECK (user_can_access_conversation(conversation_id));

CREATE POLICY "Users can update messages in accessible conversations"
    ON messages
    FOR UPDATE
    USING (user_can_access_conversation(conversation_id));

-- Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'messages';
