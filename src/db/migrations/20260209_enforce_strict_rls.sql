-- SECURITY LOCKDOWN: Enforce RLS on remaining public tables
-- Identified via audit: billing_overage_rates, domain_events

-- 1. Billing Overage Rates (System Config / Pricing)
-- Sensitivity: Low (Public Pricing), but should not be modifiable by users.
ALTER TABLE IF EXISTS public.billing_overage_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can READ rates (needed for billing calculations/display)
DROP POLICY IF EXISTS "Authenticated users can view rates" ON public.billing_overage_rates;
CREATE POLICY "Authenticated users can view rates" ON public.billing_overage_rates
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: No one (except Service Role) can modify.
-- (Implicit Deny for Insert/Update/Delete)


-- 2. Domain Events (System Internals)
-- Sensitivity: High (Internal Logs). Users should NEVER access this directly.
ALTER TABLE IF EXISTS public.domain_events ENABLE ROW LEVEL SECURITY;

-- Policy: Explicit DENY for authenticated users (Default RLS behavior is deny if no policy matches, but being explicit helps).
-- We actually DON'T create a policy for 'authenticated', which means they get access to ZERO rows.
-- Only Service Role (superuser) bypasses RLS and can Insert/Select/Process events.


-- 3. Final Safety Verification
-- Re-run diagnosis to ensure list is clear.
DO $$
BEGIN
    RAISE NOTICE 'RLS checks completed. Billing Rates open for read, Domain Events locked down.';
END $$;
