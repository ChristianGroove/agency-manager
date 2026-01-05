-- Phase 4: Hierarchy & Reselling

-- 1. Add Pillars of Hierarchy
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS parent_organization_id UUID REFERENCES public.organizations(id),
ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'client' CHECK (organization_type IN ('platform', 'reseller', 'operator', 'client'));

-- 2. Update RLS for Resellers
-- A user who is a member of the PARENT organization should be able to view child organizations?
-- Or "Tenant Isolation" is strict?
-- Current Policy: "Members can view their own organization" (where user is member).

-- New Policy: "Resellers can view their child organizations"
CREATE POLICY "Resellers can view child organizations" ON public.organizations
    FOR SELECT
    USING (
        parent_organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- Also need to allow creating child organizations
-- Usually handled by a specific RPC or Admin action, but RLS on INSERT:
CREATE POLICY "Resellers can create child organizations" ON public.organizations
    FOR INSERT
    WITH CHECK (
        parent_organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- 3. Data Visibility (Optional for Phase 4, critical for Dashboard)
-- Do we want Resellers to see Clients' Data (Leads, etc)?
-- If yes, we need to update "Tenant Isolation" on ALL tables to allow parent_org members.
-- "organization_id IN (my_orgs) OR organization_id IN (child_orgs_of_my_orgs)"

-- For performance, usually we don't complicate the RLS of every table yet.
-- Using `supbaseAdmin` (Service Role) in "Admin Dashboard" is preferred for Resellers viewing Client stats.
-- But for "Impersonation", we might need token swapping.

-- For now, we stick to: Hierarchy exists, Billing flows up.
