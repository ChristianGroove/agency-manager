-- FIX RLS FOR MESSAGES TABLE
-- Messages should be visible to users in the same organization as the conversation

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;

-- Create new RLS policies that filter by organization through conversations
CREATE POLICY "Users can view messages from their organization"
    ON messages
    FOR SELECT
    USING (
        conversation_id IN (
            SELECT c.id 
            FROM conversations c
            WHERE c.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert messages to their organization's conversations"
    ON messages
    FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT c.id 
            FROM conversations c
            WHERE c.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update messages in their organization"
    ON messages
    FOR UPDATE
    USING (
        conversation_id IN (
            SELECT c.id 
            FROM conversations c
            WHERE c.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'messages';
