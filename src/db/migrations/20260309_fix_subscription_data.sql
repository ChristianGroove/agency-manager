-- FIX: Plan ID must be TEXT to match saas_apps.id which are strings like 'app_agency'
ALTER TABLE public.saas_subscriptions 
DROP CONSTRAINT IF EXISTS saas_subscriptions_plan_id_fkey;

ALTER TABLE public.saas_subscriptions 
ALTER COLUMN plan_id TYPE TEXT;

-- INITIAL DATA POPULATION
-- Create an active subscription for every organization that doesn't have one
-- This ensures the SpaceStatusBadge and Admin UI appear immediately.
INSERT INTO public.saas_subscriptions (organization_id, plan_id, status, billing_cycle, current_period_end)
SELECT 
    id as organization_id, 
    COALESCE(active_app_id, 'app_agency') as plan_id, 
    'active' as status, 
    'monthly' as billing_cycle,
    timezone('utc'::text, now()) + interval '30 days' as current_period_end
FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;

-- UPDATE SAAS APPS with default features if empty
UPDATE public.saas_apps
SET features = '["Gestión Multi-Agente", "Automatizaciones Ilimitadas", "Soporte Prioritario 24/7", "WhatsApp API Integration"]'::JSONB
WHERE features = '[]'::JSONB;

-- UPDATE SAAS APPS with default pricing plans if empty
UPDATE public.saas_apps
SET pricing_plans = jsonb_build_object(
    'monthly', price_monthly,
    'quarterly', price_monthly * 2.7,
    'annual', price_monthly * 10
)
WHERE pricing_plans = '{}'::JSONB;
