-- ========================================
-- VERIFICATION QUERIES - Dynamic Module System
-- ========================================
-- Use these to verify the system is working correctly
-- ========================================

-- 1. Check Pixy Agency modules
SELECT 
    o.name as organization,
    COUNT(DISTINCT sm.id) as module_count,
    ARRAY_AGG(DISTINCT sm.key ORDER BY sm.key) as modules
FROM organizations o
JOIN organization_saas_products osp ON o.id = osp.organization_id
JOIN saas_products sp ON osp.product_id = sp.id
JOIN saas_product_modules spm ON sp.id = spm.product_id
JOIN system_modules sm ON spm.module_id = sm.id
WHERE o.name = 'Pixy Agency'
AND osp.status = 'active'
GROUP BY o.name;

-- 2. Test the fallback function for Pixy
SELECT * FROM get_org_modules_with_fallback(
    (SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1)
);

-- 3. Check all organizations and their modules
SELECT 
    o.name,
    o.id,
    COUNT(DISTINCT sm.id) as modules,
    STRING_AGG(DISTINCT sm.key, ', ' ORDER BY sm.key) as module_list
FROM organizations o
LEFT JOIN organization_saas_products osp ON o.id = osp.organization_id AND osp.status = 'active'
LEFT JOIN saas_products sp ON osp.product_id = sp.id
LEFT JOIN saas_product_modules spm ON sp.id = spm.product_id
LEFT JOIN system_modules sm ON spm.module_id = sm.id
GROUP BY o.id, o.name
ORDER BY o.name;

-- 4. Verify no organization has zero modules (should have core at minimum via fallback)
SELECT 
    o.name,
    o.id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM organization_saas_products 
            WHERE organization_id = o.id AND status = 'active'
        ) THEN 'HAS_SUBSCRIPTION'
        ELSE 'FALLBACK_TO_CORE'
    END as status
FROM organizations o
ORDER BY o.name;

-- 5. List all available SaaS products and their modules
SELECT 
    sp.name as product,
    sp.slug,
    sp.status,
    COUNT(spm.module_id) as module_count,
    ARRAY_AGG(sm.key ORDER BY sm.key) as modules
FROM saas_products sp
LEFT JOIN saas_product_modules spm ON sp.id = spm.product_id
LEFT JOIN system_modules sm ON spm.module_id = sm.id
GROUP BY sp.id, sp.name, sp.slug, sp.status
ORDER BY sp.name;
