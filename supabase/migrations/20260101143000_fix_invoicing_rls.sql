-- ============================================
-- FIX: INVOICING DATA ISOLAITON (RLS)
-- Date: 2026-01-01
-- Purpose: Prevent data leakage between verticals/organizations
-- ============================================

-- 1. SECURE EMITTERS TABLE
ALTER TABLE IF EXISTS public.emitters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Emitters isolation policy" ON public.emitters;
DROP POLICY IF EXISTS "emitters_isolation_policy" ON public.emitters;

CREATE POLICY "emitters_isolation_policy" ON public.emitters
    USING (
        (auth.jwt() ->> 'platform_role' = 'super_admin') OR
        (organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        ))
    )
    WITH CHECK (
        (auth.jwt() ->> 'platform_role' = 'super_admin') OR
        (organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        ))
    );

-- 2. SECURE INVOICES TABLE (Proactive fix)
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invoices isolation policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_isolation_policy" ON public.invoices;

CREATE POLICY "invoices_isolation_policy" ON public.invoices
    USING (
        (auth.jwt() ->> 'platform_role' = 'super_admin') OR
        (client_id IN (
            SELECT id 
            FROM public.clients 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        ))
    );

-- 3. SECURE BILLING CYCLES (Proactive fix)
ALTER TABLE IF EXISTS public.billing_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_cycles_isolation" ON public.billing_cycles;

CREATE POLICY "billing_cycles_isolation" ON public.billing_cycles
    USING (
        (auth.jwt() ->> 'platform_role' = 'super_admin') OR
        (service_id IN (
            SELECT id 
            FROM public.services 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        ))
    );

-- Log success
DO $$
BEGIN
    RAISE NOTICE '✅ INVOICING SECURITY AUDIT COMPLETE: RLS Enforced on Emitters, Invoices, Billing Cycles';
END $$;
