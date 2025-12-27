-- ========================================
-- CRITICAL SAFETY SCRIPT: Pixy Agency Full Access
-- ========================================
-- This script MUST be executed BEFORE deploying dynamic sidebar
-- Ensures Pixy Agency has all modules to prevent blackout
--
-- Execute this in Supabase SQL Editor FIRST!
-- ========================================

-- Step 1: Verify Pixy Agency exists
DO $$
DECLARE
    pixy_org_id UUID;
BEGIN
    SELECT id INTO pixy_org_id 
    FROM public.organizations 
    WHERE name = 'Pixy Agency'
    LIMIT 1;
    
    IF pixy_org_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Pixy Agency organization not found!';
    ELSE
        RAISE NOTICE 'Pixy Agency found: %', pixy_org_id;
    END IF;
END $$;

-- Step 2: Ensure "Complete SaaS Package" product exists
DO $$
DECLARE
    complete_package_id UUID;
BEGIN
    -- Insert or get existing product
    INSERT INTO public.saas_products (
        name,
        slug,
        description,
        pricing_model,
        status
    ) VALUES (
        'Complete SaaS Package - Pixy',
        'complete-package-pixy',
        'Full access to all platform modules for Pixy Agency',
        'custom',
        'active'
    )
    ON CONFLICT (name) 
    DO UPDATE SET 
        status = 'active',
        description = EXCLUDED.description
    RETURNING id INTO complete_package_id;
    
    RAISE NOTICE 'Complete SaaS Package ID: %', complete_package_id;
END $$;

-- Step 3: Get the Complete Package ID
DO $$
DECLARE
    complete_package_id UUID;
    pixy_org_id UUID;
    module_record RECORD;
BEGIN
    -- Get Pixy org ID
    SELECT id INTO pixy_org_id 
    FROM public.organizations 
    WHERE name = 'Pixy Agency'
    LIMIT 1;
    
    -- Get Complete Package ID
    SELECT id INTO complete_package_id 
    FROM public.saas_products 
    WHERE name = 'Complete SaaS Package - Pixy'
    LIMIT 1;
    
    RAISE NOTICE 'Pixy Org ID: %', pixy_org_id;
    RAISE NOTICE 'Complete Package ID: %', complete_package_id;
    
    -- Link ALL system modules to this product
    FOR module_record IN 
        SELECT id, key, name FROM public.system_modules
    LOOP
        -- Upsert module to product
        INSERT INTO public.saas_product_modules (
            product_id,
            module_id
        ) VALUES (
            complete_package_id,
            module_record.id
        )
        ON CONFLICT (product_id, module_id) DO NOTHING;
        
        RAISE NOTICE 'Linked module: % (%)', module_record.key, module_record.name;
    END LOOP;
    
    -- Assign Complete Package to Pixy Agency
    INSERT INTO public.organization_saas_products (
        organization_id,
        product_id,
        status,
        activated_at
    ) VALUES (
        pixy_org_id,
        complete_package_id,
        'active',
        NOW()
    )
    ON CONFLICT (organization_id, product_id) 
    DO UPDATE SET 
        status = 'active',
        activated_at = COALESCE(organization_saas_products.activated_at, NOW());
    
    RAISE NOTICE 'Complete Package assigned to Pixy Agency';
END $$;

-- Step 4: VERIFY - Check what modules Pixy has
SELECT 
    sm.key,
    sm.name,
    sm.category,
    osp.status as subscription_status,
    osp.activated_at
FROM public.system_modules sm
JOIN public.saas_product_modules spm ON sm.id = spm.module_id
JOIN public.saas_products sp ON spm.product_id = sp.id
JOIN public.organization_saas_products osp ON sp.id = osp.product_id
JOIN public.organizations o ON osp.organization_id = o.id
WHERE o.name = 'Pixy Agency'
AND osp.status = 'active'
ORDER BY sm.category, sm.key;

-- Step 5: Safety Check - Count modules
DO $$
DECLARE
    total_modules INTEGER;
    pixy_modules INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_modules FROM public.system_modules;
    
    SELECT COUNT(DISTINCT sm.id) INTO pixy_modules
    FROM public.system_modules sm
    JOIN public.saas_product_modules spm ON sm.id = spm.module_id
    JOIN public.saas_products sp ON spm.product_id = sp.id
    JOIN public.organization_saas_products osp ON sp.id = osp.product_id
    JOIN public.organizations o ON osp.organization_id = o.id
    WHERE o.name = 'Pixy Agency'
    AND osp.status = 'active';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'SAFETY CHECK RESULTS:';
    RAISE NOTICE 'Total modules in system: %', total_modules;
    RAISE NOTICE 'Modules available to Pixy: %', pixy_modules;
    
    IF pixy_modules < total_modules THEN
        RAISE WARNING 'Pixy Agency does not have all modules! This could cause access issues.';
    ELSE
        RAISE NOTICE '✅ SUCCESS: Pixy Agency has full access to all modules';
    END IF;
    RAISE NOTICE '===========================================';
END $$;

-- Step 6: Create fallback safety mechanism
-- If org has NO products, allow access to core modules
CREATE OR REPLACE FUNCTION public.get_org_modules_with_fallback(org_id UUID)
RETURNS TABLE (module_key TEXT) AS $$
BEGIN
    -- Check if org has any active products
    IF EXISTS (
        SELECT 1 
        FROM public.organization_saas_products 
        WHERE organization_id = org_id 
        AND status = 'active'
    ) THEN
        -- Return subscribed modules
        RETURN QUERY
        SELECT DISTINCT sm.key::TEXT
        FROM public.system_modules sm
        JOIN public.saas_product_modules spm ON sm.id = spm.module_id
        JOIN public.saas_products sp ON spm.product_id = sp.id
        JOIN public.organization_saas_products osp ON sp.id = osp.product_id
        WHERE osp.organization_id = org_id
        AND osp.status = 'active';
    ELSE
        -- FALLBACK: Return core modules only
        RETURN QUERY
        SELECT sm.key::TEXT
        FROM public.system_modules sm
        WHERE sm.category = 'core';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_org_modules_with_fallback(UUID) TO authenticated;

/*
===========================================
EXECUTION INSTRUCTIONS:
===========================================

1. Execute this script in Supabase SQL Editor
2. Check the console output for verification
3. Ensure you see: "✅ SUCCESS: Pixy Agency has full access to all modules"
4. Only AFTER success, deploy the dynamic sidebar code

IF YOU SEE ERRORS:
- Check that organization 'Pixy Agency' exists
- Verify system_modules table has data
- Check saas_products and junction tables exist

ROLLBACK PLAN:
If dynamic sidebar breaks access, run:
  SELECT set_config('request.jwt.claims', '{"org_id": "YOUR_ORG_ID"}', false);
And access will be restored via core modules fallback.

===========================================
*/
