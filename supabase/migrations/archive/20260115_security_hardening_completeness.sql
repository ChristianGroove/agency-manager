-- =============================================================================
-- SECURITY HARDENING: FIX REMAINING LEAKS
-- =============================================================================
-- Date: 2026-01-15
-- Issues Found:
-- 1. saved_replies: Policy was `USING (true)` (Global Leak)
-- 2. quick_replies: Policy was `authenticated` only (Global Leak)
-- 3. messages: Missing explicit org-scoped policies (Potential Leak)
-- 4. message_reactions: Missing explicit org-scoped policies (Potential Leak)
-- =============================================================================

BEGIN;

-- 1. FIX SAVED_REPLIES (CRITICAL)
ALTER TABLE public.saved_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated" ON public.saved_replies;
CREATE POLICY "Users can view saved_replies in their org"
    ON public.saved_replies FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.saved_replies;
CREATE POLICY "Users can create saved_replies in their org"
    ON public.saved_replies FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow update for authenticated" ON public.saved_replies;
CREATE POLICY "Users can update saved_replies in their org"
    ON public.saved_replies FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow delete for authenticated" ON public.saved_replies;
CREATE POLICY "Users can delete saved_replies in their org"
    ON public.saved_replies FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );


-- 2. FIX QUICK_REPLIES (CRITICAL)
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org quick replies" ON public.quick_replies;
CREATE POLICY "Users can view quick_replies in their org"
    ON public.quick_replies FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create quick replies" ON public.quick_replies;
CREATE POLICY "Users can create quick_replies in their org"
    ON public.quick_replies FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update quick replies" ON public.quick_replies;
CREATE POLICY "Users can update quick_replies in their org"
    ON public.quick_replies FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );


-- 3. FIX MESSAGES (INDIRECT ORG ACCESS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Note: messages usually don't have organization_id, they link to conversations properly.
-- We must ensure the user has access to the conversation.

DROP POLICY IF EXISTS "Allow delete messages for authenticated users" ON public.messages;
-- Dropping potential "permissive" policies from previous migrations
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert messages in their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update messages in their conversations"
    ON public.messages FOR UPDATE
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete messages in their conversations"
    ON public.messages FOR DELETE
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );


-- 4. FIX MESSAGE_REACTIONS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their org"
    ON public.message_reactions FOR SELECT
    USING (
        message_id IN (
            SELECT id FROM public.messages WHERE conversation_id IN (
                SELECT id FROM public.conversations WHERE organization_id IN (
                    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
                )
            )
        )
    );

-- 5. AGENT_PRESENCE (Privacy Hardening)
-- Only allow viewing presence of users in same organization
-- This implies finding common organizations between auth.uid() and agent_presence.user_id
ALTER TABLE public.agent_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view presence" ON public.agent_presence;
CREATE POLICY "Users can view presence of agents in their org"
    ON public.agent_presence FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.organization_members my_orgs
            JOIN public.organization_members agent_orgs ON my_orgs.organization_id = agent_orgs.organization_id
            WHERE my_orgs.user_id = auth.uid()
            AND agent_orgs.user_id = public.agent_presence.user_id
        )
    );


COMMIT;
