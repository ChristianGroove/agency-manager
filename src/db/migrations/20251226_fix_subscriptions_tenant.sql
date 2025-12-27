-- FIX: Add Multi-Tenant Logic to Subscriptions
-- This script catches up the 'subscriptions' table which was missing from the main migration.

-- 1. Add organization_id column
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 2. Backfill organization_id from the linked client
-- This is critical to ensure data visibility
UPDATE public.subscriptions s
SET organization_id = c.organization_id
FROM public.clients c
WHERE s.client_id = c.id
AND s.organization_id IS NULL;

-- 3. Set constraints (after backfill)
ALTER TABLE public.subscriptions ALTER COLUMN organization_id SET NOT NULL;

-- 4. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Add Tenant Isolation Policy
DROP POLICY IF EXISTS "Tenant Isolation" ON public.subscriptions;
CREATE POLICY "Tenant Isolation" ON public.subscriptions
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
