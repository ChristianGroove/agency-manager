-- CRITICAL SECURITY FIX: Enable RLS for Messaging Module
-- Prevents tenants from seeing each other's conversations.

-- 1. Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Conversations Policy (Direct link to Organization)
DROP POLICY IF EXISTS "Tenant Isolation" ON public.conversations;

CREATE POLICY "Tenant Isolation" ON public.conversations
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- 3. Messages Policy (Indirect link via Conversation)
-- Users can only see messages belonging to conversations they have access to.
DROP POLICY IF EXISTS "Tenant Isolation via Conversation" ON public.messages;

CREATE POLICY "Tenant Isolation via Conversation" ON public.messages
    FOR ALL
    USING (
        conversation_id IN (
            SELECT id 
            FROM public.conversations 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        conversation_id IN (
            SELECT id 
            FROM public.conversations 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- 4. Verify/Fix Organization ID on specific tables if needed
-- (Optional) Ensure contacts/leads also have RLS if they are separate
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
-- Assuming leads/contacts have organization_id. If not, this might fail or need a join.

-- Notification
DO $$
BEGIN
    RAISE NOTICE 'RLS enabled for Conversations and Messages. Tenant isolation is now enforced.';
END $$;
