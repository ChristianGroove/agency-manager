-- ULTRA-SIMPLE RLS FOR MESSAGES (NO FUNCTIONS)
-- Direct inline policy without helper functions

-- Drop all existing
DROP POLICY IF EXISTS "Users can view messages from accessible conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to accessible conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in accessible conversations" ON messages;
DROP FUNCTION IF EXISTS user_can_access_conversation(uuid);

-- Create the simplest possible policies with inline checks
CREATE POLICY "messages_select_policy"
    ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM conversations c
            INNER JOIN organization_members om 
                ON om.organization_id = c.organization_id 
                AND om.user_id = auth.uid()
            WHERE c.id = messages.conversation_id
        )
    );

CREATE POLICY "messages_insert_policy"
    ON messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM conversations c
            INNER JOIN organization_members om 
                ON om.organization_id = c.organization_id 
                AND om.user_id = auth.uid()
            WHERE c.id = messages.conversation_id
        )
    );

CREATE POLICY "messages_update_policy"
    ON messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM conversations c
            INNER JOIN organization_members om 
                ON om.organization_id = c.organization_id 
                AND om.user_id = auth.uid()
            WHERE c.id = messages.conversation_id
        )
    );

-- Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'messages';
