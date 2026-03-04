-- Fix RLS policies to allow system/webhook to create leads

-- Allow service role to bypass RLS for lead creation from webhooks
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Update INSERT policy to allow service role (webhooks) to create leads
DROP POLICY IF EXISTS "Users can create leads" ON public.leads;
CREATE POLICY "Users can create leads"
    ON public.leads
    FOR INSERT
    WITH CHECK (
        -- Allow if user is authenticated and in organization
        (
            auth.uid() IS NOT NULL
            AND organization_id IN (
                SELECT organization_id
                FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
        -- OR allow service role (for webhooks)
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- Make user_id nullable for leads created via webhooks
ALTER TABLE public.leads ALTER COLUMN user_id DROP NOT NULL;

-- Update other policies to not require user_id match
DROP POLICY IF EXISTS "Users can update their leads" ON public.leads;
CREATE POLICY "Users can update their leads"
    ON public.leads
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their leads" ON public.leads;
CREATE POLICY "Users can delete their leads"
    ON public.leads
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Verify the changes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'leads';
