-- ========================================
-- SIMPLIFIED SAFETY SCRIPT: Pixy Agency Full Access
-- ========================================
-- This is a simplified version that avoids ON CONFLICT issues
-- Execute this in Supabase SQL Editor FIRST!
-- ========================================

-- Combined script that does everything in one DO block
DO $$
DECLARE
    pixy_org_id UUID;
    complete_package_id UUID;
    module_record RECORD;
    total_modules INTEGER;
    pixy_modules INTEGER;
BEGIN
    -- 1. Verify Pixy Agency exists
    SELECT id INTO pixy_org_id 
    FROM public.organizations 
    WHERE name = 'Pixy Agency'
    LIMIT 1;
    
    IF pixy_org_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Pixy Agency organization not found!';
    END IF;
    
    RAISE NOTICE '✓ Pixy Agency found: %', pixy_org_id;
    
    -- 2. Get or create "Complete SaaS Package"
    SELECT id INTO complete_package_id
    FROM public.saas_products
    WHERE name = 'Complete SaaS Package - Pixy'
    LIMIT 1;
    
    IF complete_package_id IS NULL THEN
        INSERT INTO public.saas_products (name, slug, description, pricing_model, status)
        VALUES (
            'Complete SaaS Package - Pixy',
            'complete-package-pixy',
            'Full access to all platform modules for Pixy Agency',
            'custom',
            'active'
        )
        RETURNING id INTO complete_package_id;
        
        RAISE NOTICE '✓ Created Complete SaaS Package: %', complete_package_id;
    ELSE
        -- Update to ensure it's active
        UPDATE public.saas_products
        SET status = 'active',
            description = 'Full access to all platform modules for Pixy Agency'
        WHERE id = complete_package_id;
        
        RAISE NOTICE '✓ Found existing Complete SaaS Package: %', complete_package_id;
    END IF;
    
    -- 3. Link ALL system modules to this product
    FOR module_record IN 
        SELECT id, key, name FROM public.system_modules
    LOOP
        -- Insert if not exists
        INSERT INTO public.saas_product_modules (product_id, module_id)
        VALUES (complete_package_id, module_record.id)
        ON CONFLICT (product_id, module_id) DO NOTHING;
        
        RAISE NOTICE '  → Linked: % (%)', module_record.key, module_record.name;
    END LOOP;
    
    -- 4. Assign Complete Package to Pixy Agency
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
    
    RAISE NOTICE '✓ Complete Package assigned to Pixy Agency';
    
    -- 5. Safety Check - Count modules
    SELECT COUNT(*) INTO total_modules FROM public.system_modules;
    
    SELECT COUNT(DISTINCT sm.id) INTO pixy_modules
    FROM public.system_modules sm
    JOIN public.saas_product_modules spm ON sm.id = spm.module_id
    JOIN public.saas_products sp ON spm.product_id = sp.id
    JOIN public.organization_saas_products osp ON sp.id = osp.product_id
    WHERE osp.organization_id = pixy_org_id
    AND osp.status = 'active';
    
    RAISE NOTICE '';
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

-- Create fallback safety function
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

-- Final verification query
SELECT 
    sm.key,
    sm.name,
    sm.category
FROM public.system_modules sm
JOIN public.saas_product_modules spm ON sm.id = spm.module_id
JOIN public.saas_products sp ON spm.product_id = sp.id
JOIN public.organization_saas_products osp ON sp.id = osp.product_id
JOIN public.organizations o ON osp.organization_id = o.id
WHERE o.name = 'Pixy Agency'
AND osp.status = 'active'
ORDER BY sm.category, sm.key;
