-- Phase 5: Pricing & Packaging

-- 1. Billing Packages (Consumables)
-- Defines a bundle of usage (e.g., 10k Automation Executions)
CREATE TABLE IF NOT EXISTS public.billing_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g. "Automation Pro"
    code TEXT UNIQUE NOT NULL, -- e.g. "automation_pro_10k"
    description TEXT,
    engine TEXT NOT NULL, -- automation, messaging, etc.
    limit_value INTEGER NOT NULL, -- 10000
    period TEXT NOT NULL DEFAULT 'month' CHECK (period IN ('day', 'month')),
    price_monthly NUMERIC(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Organization Subscriptions (Active Packages)
-- An org can have multiple packages (e.g. Base Automation + Extra Automation)
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.billing_packages(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Overage Rates (The accelerator)
CREATE TABLE IF NOT EXISTS public.billing_overage_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- specific overrides
    organization_type TEXT, -- e.g. 'reseller' pays X, 'client' pays Y (if direct)
    engine TEXT NOT NULL,
    unit_price NUMERIC(10, 4) NOT NULL, -- e.g. 0.0015
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Automatic Provisioning Function
-- This function calculates the TOTAL entitlement for an org based on active subscriptions
-- and updates the 'usage_limits' table (Phase 3).
CREATE OR REPLACE FUNCTION public.provision_limits(target_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
BEGIN
    -- For each engine/period, sum the limit_value of active subscriptions
    FOR rec IN 
        SELECT 
            p.engine, 
            p.period, 
            SUM(p.limit_value) as total_limit
        FROM public.billing_subscriptions s
        JOIN public.billing_packages p ON s.package_id = p.id
        WHERE s.organization_id = target_org_id 
          AND s.status = 'active'
        GROUP BY p.engine, p.period
    LOOP
        -- Upsert into usage_limits
        INSERT INTO public.usage_limits (organization_id, engine, period, limit_value)
        VALUES (target_org_id, rec.engine, rec.period, rec.total_limit)
        ON CONFLICT (organization_id, engine, period)
        DO UPDATE SET limit_value = EXCLUDED.limit_value, updated_at = now();
    END LOOP;
END;
$$;

-- 5. Trigger to Auto-Provision on Subscription Change
CREATE OR REPLACE FUNCTION public.trigger_provision_limits()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.provision_limits(OLD.organization_id);
    ELSE
        PERFORM public.provision_limits(NEW.organization_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_limits
    AFTER INSERT OR UPDATE OR DELETE ON public.billing_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_provision_limits();

-- RLS
ALTER TABLE public.billing_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_overage_rates ENABLE ROW LEVEL SECURITY;

-- Admins read all packages (Catalog)
CREATE POLICY "Admins read packages" ON public.billing_packages FOR SELECT USING (true);

-- Members read their own subscriptions
CREATE POLICY "Members read own subs" ON public.billing_subscriptions
    FOR SELECT USING (
         organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );
