-- Enable RLS for critical tables to fix security warnings
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.domain_events ENABLE ROW LEVEL SECURITY;

-- 1. Organizations Policies

-- Allow authenticated users to create organizations (e.g. during onboarding)
DROP POLICY IF EXISTS "Authenticated users may insert organizations" ON public.organizations;
CREATE POLICY "Authenticated users may insert organizations" ON public.organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow organization members to view their own organization details
DROP POLICY IF EXISTS "Members can view own organization" ON public.organizations;
CREATE POLICY "Members can view own organization" ON public.organizations
    FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Allow organization members to update their own organization details
DROP POLICY IF EXISTS "Members can update own organization" ON public.organizations;
CREATE POLICY "Members can update own organization" ON public.organizations
    FOR UPDATE
    TO authenticated
    USING (
        id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- 2. Domain Events Policies
-- RLS Enabled above implies DENY ALL for public/anon/authenticated unless policies exist.
-- Service Role bypasses RLS, so backend logic remains functional.
-- No explicit policies added here to enforce strict security (Private Table).
