-- ============================================
-- BILLING EVOLUTION: CUSTOM PRICES, CYCLES & BYPASS
-- ============================================

-- 1. Extend saas_apps (Spaces) with Features & Multi-Cycle Pricing
ALTER TABLE public.saas_apps 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS pricing_plans JSONB DEFAULT '{}'::JSONB;

-- 2. Extend saas_subscriptions with Admin Controls
ALTER TABLE public.saas_subscriptions
ADD COLUMN IF NOT EXISTS custom_price NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
ADD COLUMN IF NOT EXISTS bypass_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 3. Update Existing Data (Defaults)
-- Setting a default pricing plan for existing apps based on their current monthly price
UPDATE public.saas_apps 
SET pricing_plans = jsonb_build_object('monthly', price_monthly)
WHERE pricing_plans = '{}'::JSONB;

-- 4. Audit Log Extension (Metadata for bypass and custom prices)
COMMENT ON COLUMN public.saas_subscriptions.bypass_until IS 'Administrator-set date to bypass billing charges. Access remains active until this date without transactions.';
COMMENT ON COLUMN public.saas_subscriptions.custom_price IS 'Organization-specific price override for the platform subscription.';
