-- ========================================
-- FINAL WORKING VERSION - Pixy Agency Full Access
-- ========================================
-- This script was tested and works correctly
-- Execute AFTER creating organization_saas_products table
-- ========================================

-- Step 1: Create junction table if not exists
CREATE TABLE IF NOT EXISTS public.organization_saas_products (
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.saas_products(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (organization_id, product_id)
);

ALTER TABLE public.organization_saas_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.organization_saas_products FOR SELECT USING (true);
CREATE POLICY "Admin access" ON public.organization_saas_products FOR ALL USING (auth.role() = 'service_role');

-- Step 2: Assign all modules to Pixy Agency
DO $$
DECLARE
    pixy_org_id UUID;
    pkg_id UUID;
    m RECORD;
    total INT;
    pixy INT;
BEGIN
    SELECT id INTO pixy_org_id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1;
    IF pixy_org_id IS NULL THEN RAISE EXCEPTION 'Pixy not found'; END IF;
    RAISE NOTICE '✓ Pixy Agency: %', pixy_org_id;
    
    SELECT id INTO pkg_id FROM saas_products WHERE name = 'Complete SaaS Package - Pixy' LIMIT 1;
    IF pkg_id IS NULL THEN
        INSERT INTO saas_products (name, slug, description, pricing_model, status)
        VALUES ('Complete SaaS Package - Pixy', 'complete-package-pixy', 'All modules', 'subscription', 'published')
        RETURNING id INTO pkg_id;
        RAISE NOTICE '✓ Created package: %', pkg_id;
    ELSE
        RAISE NOTICE '✓ Found package: %', pkg_id;
    END IF;
    
    FOR m IN SELECT id, key FROM system_modules LOOP
        INSERT INTO saas_product_modules (product_id, module_id) VALUES (pkg_id, m.id) ON CONFLICT DO NOTHING;
    END LOOP;
    RAISE NOTICE '✓ Linked all modules';
    
    INSERT INTO organization_saas_products (organization_id, product_id, status)
    VALUES (pixy_org_id, pkg_id, 'active') ON CONFLICT DO NOTHING;
    RAISE NOTICE '✓ Assigned to Pixy';
    
    SELECT COUNT(*) INTO total FROM system_modules;
    SELECT COUNT(DISTINCT sm.id) INTO pixy
    FROM system_modules sm
    JOIN saas_product_modules spm ON sm.id = spm.module_id
    JOIN saas_products sp ON spm.product_id = sp.id
    JOIN organization_saas_products osp ON sp.id = osp.product_id
    WHERE osp.organization_id = pixy_org_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total modules: % | Pixy has: %', total, pixy;
    IF pixy >= total THEN 
        RAISE NOTICE '✅ SUCCESS: Pixy Agency has full access';
    ELSE 
        RAISE WARNING 'MISSING MODULES!';
    END IF;
    RAISE NOTICE '===========================================';
END $$;

-- Step 3: Create fallback safety function
CREATE OR REPLACE FUNCTION get_org_modules_with_fallback(org_id UUID)
RETURNS TABLE (module_key TEXT) AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM organization_saas_products WHERE organization_id = org_id AND status = 'active') THEN
        RETURN QUERY SELECT DISTINCT sm.key::TEXT FROM system_modules sm
        JOIN saas_product_modules spm ON sm.id = spm.module_id
        JOIN saas_products sp ON spm.product_id = sp.id
        JOIN organization_saas_products osp ON sp.id = osp.product_id
        WHERE osp.organization_id = org_id AND osp.status = 'active';
    ELSE
        RETURN QUERY SELECT sm.key::TEXT FROM system_modules sm WHERE sm.category = 'core';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_org_modules_with_fallback(UUID) TO authenticated;
