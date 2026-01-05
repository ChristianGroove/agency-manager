-- Phase 3: Usage Limits & Auto-Suspension

-- 1. Ensure Organizations has Status columns
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'limited', 'suspended')),
ADD COLUMN IF NOT EXISTS status_reason text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'good_standing';

-- 2. Usage Limits Table
-- Defines the entitlement (Quota)
CREATE TABLE IF NOT EXISTS public.usage_limits (
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    engine text NOT NULL, -- 'automation', 'messaging', 'ai', 'storage'
    period text NOT NULL CHECK (period IN ('day', 'month')),
    limit_value integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (organization_id, engine, period)
);

-- 3. Usage Counters table
-- Aggregates usage for fast lookup
CREATE TABLE IF NOT EXISTS public.usage_counters (
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    engine text NOT NULL,
    period_start date NOT NULL, -- The start of the day or month
    period text NOT NULL CHECK (period IN ('day', 'month')),
    used integer NOT NULL DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (organization_id, engine, period_start, period)
);

-- 4. Security (RLS)
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can view their limits
CREATE POLICY "Admins can view their limits" ON public.usage_limits
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Policy: Admin can view their counters
CREATE POLICY "Admins can view their counters" ON public.usage_counters
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Only Service Role can insert/update limits (System Billing Logic)
-- Only Service Role can update counters (Usage Tracker)

-- 5. RPC for Atomic Increment
CREATE OR REPLACE FUNCTION public.increment_usage(
    p_organization_id uuid,
    p_engine text,
    p_quantity int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today date := current_date;
    v_month_start date := date_trunc('month', current_date)::date;
BEGIN
    -- Day Counter
    INSERT INTO public.usage_counters (organization_id, engine, period_start, period, used)
    VALUES (p_organization_id, p_engine, v_today, 'day', p_quantity)
    ON CONFLICT (organization_id, engine, period_start, period)
    DO UPDATE SET used = usage_counters.used + EXCLUDED.used, updated_at = now();

    -- Month Counter
    INSERT INTO public.usage_counters (organization_id, engine, period_start, period, used)
    VALUES (p_organization_id, p_engine, v_month_start, 'month', p_quantity)
    ON CONFLICT (organization_id, engine, period_start, period)
    DO UPDATE SET used = usage_counters.used + EXCLUDED.used, updated_at = now();
END;
$$;
