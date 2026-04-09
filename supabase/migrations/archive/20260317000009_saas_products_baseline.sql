-- ========================================================
-- SAAS PRODUCTS BASELINE (V3.0)
-- Ensures the system has at least one functional plan
-- and repairs orphaned organizations.
-- ========================================================

-- 1. Ensure Standard Plan exists
DO $$
DECLARE
    standard_plan_id UUID;
BEGIN
    -- Check if we have ANY plan
    IF NOT EXISTS (SELECT 1 FROM public.saas_products) THEN
        -- Create Baseline Standard Plan
        INSERT INTO public.saas_products (name, slug, description, pricing_model, status, base_price)
        VALUES (
            'Plan Estándar Cloud', 
            'standard-cloud', 
            'Acceso completo a la plataforma Pixy Spaces', 
            'subscription', 
            'published',
            49.99
        )
        RETURNING id INTO standard_plan_id;

        -- Link all core modules to this baseline plan
        INSERT INTO public.saas_product_modules (product_id, module_id)
        SELECT standard_plan_id, id FROM public.system_modules;
        
        RAISE NOTICE 'Baseline Standard Plan created: %', standard_plan_id;
    ELSE
        SELECT id INTO standard_plan_id FROM public.saas_products LIMIT 1;
    END IF;

    -- 2. REPAIR: Assign baseline plan to organizations that have it NULL
    UPDATE public.organizations
    SET subscription_product_id = standard_plan_id
    WHERE subscription_product_id IS NULL;

    RAISE NOTICE 'Repaired Organizations with baseline plan %', standard_plan_id;
END $$;
