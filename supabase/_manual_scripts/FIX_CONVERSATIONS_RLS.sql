-- Fix RLS policies for conversations to filter by organization

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON public.conversations;

-- CREATE new policies that filter by organization membership
CREATE POLICY "Users can view conversations"
    ON public.conversations
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert conversations"
    ON public.conversations
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update conversations"
    ON public.conversations
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Verify the new policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'conversations';
