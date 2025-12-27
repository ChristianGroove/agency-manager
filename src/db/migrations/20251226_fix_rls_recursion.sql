-- FIX: RLS Infinite Recursion
-- The previous policies caused infinite loops because they queried the tables they were protecting.
-- We fix this by ensuring ALL policies use the SECURITY DEFINER function to lookup membership.

-- 1. Redefine Helper Function (Just to be sure it is correct)
CREATE OR REPLACE FUNCTION public.get_auth_org_ids()
RETURNS TABLE (organization_id UUID) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;


-- 2. FIX ORGANIZATION POLICIES
DROP POLICY IF EXISTS "Members can view their own organization" ON public.organizations;
CREATE POLICY "Members can view their own organization" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM public.get_auth_org_ids())
    );

-- 3. FIX MEMBER POLICIES (The source of recursion)
DROP POLICY IF EXISTS "Members can view other members" ON public.organization_members;
CREATE POLICY "Members can view other members" ON public.organization_members
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.get_auth_org_ids())
    );


-- 4. UPDATE DATA TABLE POLICIES (Optimization)
-- While not strictly recursive for them (they query members, not themselves), 
-- using the function is cleaner and faster as it centralizes the logic.

-- CLIENTS
DROP POLICY IF EXISTS "Tenant Isolation" ON public.clients;
CREATE POLICY "Tenant Isolation" ON public.clients
    USING (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()));

-- SERVICES
DROP POLICY IF EXISTS "Tenant Isolation" ON public.services;
CREATE POLICY "Tenant Isolation" ON public.services
    USING (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()));

-- QUOTES
DROP POLICY IF EXISTS "Tenant Isolation" ON public.quotes;
CREATE POLICY "Tenant Isolation" ON public.quotes
    USING (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()));

-- INVOICES
DROP POLICY IF EXISTS "Tenant Isolation" ON public.invoices;
CREATE POLICY "Tenant Isolation" ON public.invoices
    USING (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()));

-- BRIEFINGS
DROP POLICY IF EXISTS "Tenant Isolation" ON public.briefings;
CREATE POLICY "Tenant Isolation" ON public.briefings
    USING (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()));

-- BRIEFING TEMPLATES
DROP POLICY IF EXISTS "Tenant Isolation" ON public.briefing_templates;
CREATE POLICY "Tenant Isolation" ON public.briefing_templates
    USING (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()));

-- SUBSCRIPTIONS (Don't forget the one we just added!)
DROP POLICY IF EXISTS "Tenant Isolation" ON public.subscriptions;
CREATE POLICY "Tenant Isolation" ON public.subscriptions
    USING (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.get_auth_org_ids()));
