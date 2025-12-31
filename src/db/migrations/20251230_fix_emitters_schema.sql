-- Fix for "Could not find the 'organization_id' column of 'emitters'" error
-- Date: 2025-12-30

-- 1. Ensure column exists
ALTER TABLE IF EXISTS public.emitters 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_emitters_organization_id ON public.emitters(organization_id);

-- 3. Enable RLS
ALTER TABLE IF EXISTS public.emitters ENABLE ROW LEVEL SECURITY;

-- 4. Add Policies

-- Policy: Members can view emitters for their organizations
DROP POLICY IF EXISTS "Members can view organization emitters" ON public.emitters;
CREATE POLICY "Members can view organization emitters" ON public.emitters
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can insert emitters for their organizations
DROP POLICY IF EXISTS "Members can insert organization emitters" ON public.emitters;
CREATE POLICY "Members can insert organization emitters" ON public.emitters
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can update emitters for their organizations
DROP POLICY IF EXISTS "Members can update organization emitters" ON public.emitters;
CREATE POLICY "Members can update organization emitters" ON public.emitters
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can delete emitters for their organizations
DROP POLICY IF EXISTS "Members can delete organization emitters" ON public.emitters;
CREATE POLICY "Members can delete organization emitters" ON public.emitters
    FOR DELETE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );
