-- Fix RLS for leads table to ensure contacts are visible in sidebar

-- 1. Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts or restrictive defaults
DROP POLICY IF EXISTS "StartFresh_Select_Leads" ON public.leads;
DROP POLICY IF EXISTS "StartFresh_Insert_Leads" ON public.leads;
DROP POLICY IF EXISTS "StartFresh_Update_Leads" ON public.leads;
DROP POLICY IF EXISTS "StartFresh_Delete_Leads" ON public.leads;

DROP POLICY IF EXISTS "Tenant Isolation" ON public.leads;
DROP POLICY IF EXISTS "leads_organization_isolation" ON public.leads;

-- 3. Create comprehensive RLS policies

-- SELECT: Members can view leads in their organization
CREATE POLICY "Tenant Isolation Select" ON public.leads
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- INSERT: Members can create leads in their organization
CREATE POLICY "Tenant Isolation Insert" ON public.leads
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- UPDATE: Members can update leads in their organization
CREATE POLICY "Tenant Isolation Update" ON public.leads
    FOR UPDATE
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

-- DELETE: Members can delete leads (or maybe restrict to admins later, but standard is fine for now)
CREATE POLICY "Tenant Isolation Delete" ON public.leads
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );
