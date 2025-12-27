-- FIX: Infinite Recursion in RLS
-- The policy "Members can view other members" triggers itself infinitely.
-- We must break the loop.

-- 1. Redefine get_auth_org_ids to be strictly SECURITY DEFINER and trusted.
CREATE OR REPLACE FUNCTION public.get_auth_org_ids()
RETURNS TABLE (organization_id UUID) 
SECURITY DEFINER
SET search_path = public -- Secure search path
AS $$
BEGIN
    RETURN QUERY 
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- 2. Fix Organization Members Policy
-- We use the FUNCTION (which is security definer) to bypass the table's own RLS during the check.
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view other members" ON public.organization_members;

-- New Policy: You can see a row in organization_members IF
-- 1. It is YOUR own row (user_id = auth.uid()) - Always allowed
-- 2. OR the organization_id of the row is in the list of orgs you belong to (via function)
CREATE POLICY "Members can view other members" ON public.organization_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        organization_id IN (SELECT * FROM public.get_auth_org_ids())
    );

-- 3. Fix Organizations Policy (Optional, but good practice)
DROP POLICY IF EXISTS "Members can view their own organization" ON public.organizations;
CREATE POLICY "Members can view their own organization" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT * FROM public.get_auth_org_ids())
    );
