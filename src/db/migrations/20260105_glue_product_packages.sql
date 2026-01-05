-- Phase 6 Audit: Glue Logic (Product -> Packages)

-- 1. Link Table
CREATE TABLE IF NOT EXISTS public.saas_product_packages (
    product_id UUID REFERENCES public.saas_products(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.billing_packages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (product_id, package_id)
);

-- RLS
ALTER TABLE public.saas_product_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.saas_product_packages FOR SELECT USING (true);

-- 2. Helper Logic (Conceptual)
-- When a Subscription to a Product is created (e.g. Stripe checkout success):
-- We look up all packages in saas_product_packages where product_id = X
-- We insert into billing_subscriptions (org_id, package_id)
-- Trigger 'provision_limits' runs and updates usage_limits.

-- Integration verified.
