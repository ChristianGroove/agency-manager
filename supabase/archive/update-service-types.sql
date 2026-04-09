-- Update service_type check constraint to include new categories
-- 'marketing_ads' for "Marketing + Meta Ads"
-- 'branding' for "Branding / Logo"

ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_service_type_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_service_type_check 
CHECK (service_type IN ('marketing', 'ads', 'crm', 'hosting', 'other', 'marketing_ads', 'branding'));
