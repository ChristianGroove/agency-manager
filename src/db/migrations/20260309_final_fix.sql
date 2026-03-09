-- 1. DROP old constraint and change type
ALTER TABLE public.saas_subscriptions 
DROP CONSTRAINT IF EXISTS saas_subscriptions_plan_id_fkey;

ALTER TABLE public.saas_subscriptions 
ALTER COLUMN plan_id TYPE TEXT;

-- 2. Clean up any invalid data that might have slipped in before re-adding constraint
-- We ensure all plan_ids in saas_subscriptions exist in saas_apps
UPDATE public.saas_subscriptions
SET plan_id = 'app_marketing_starter'
WHERE plan_id NOT IN (SELECT id FROM public.saas_apps);

-- 3. Add new relation to saas_apps (The Spaces)
ALTER TABLE public.saas_subscriptions
ADD CONSTRAINT saas_subscriptions_plan_id_fkey 
FOREIGN KEY (plan_id) REFERENCES public.saas_apps(id);

-- 4. Populate subscriptions for all orgs using their active_app_id validation
INSERT INTO public.saas_subscriptions (organization_id, plan_id, status, billing_cycle, current_period_end)
SELECT 
    id as organization_id, 
    CASE 
        WHEN active_app_id IN (SELECT id FROM public.saas_apps) THEN active_app_id
        ELSE 'app_marketing_starter'
    END as plan_id, 
    'active' as status, 
    'monthly' as billing_cycle,
    timezone('utc'::text, now()) + interval '30 days' as current_period_end
FROM public.organizations
ON CONFLICT (organization_id) DO UPDATE 
SET plan_id = EXCLUDED.plan_id, status = 'active';

-- 5. Ensure apps have features and pricing for the UI
UPDATE public.saas_apps
SET features = '["Gestión Multi-Agente", "Automatizaciones Ilimitadas", "Soporte Prioritario 24/7", "WhatsApp API Integration"]'::JSONB
WHERE features IS NULL OR features = '[]'::JSONB;

UPDATE public.saas_apps
SET pricing_plans = jsonb_build_object(
    'monthly', COALESCE(price_monthly, 29),
    'quarterly', COALESCE(price_monthly, 29) * 2.7,
    'annual', COALESCE(price_monthly, 29) * 10
)
WHERE pricing_plans IS NULL OR pricing_plans = '{}'::JSONB;
