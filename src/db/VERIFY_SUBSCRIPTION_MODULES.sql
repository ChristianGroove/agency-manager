-- Verify subscription module wiring

-- 1. Check organizations with subscription_product_id
SELECT 
    o.id,
    o.name,
    o.subscription_product_id,
    sp.name as product_name
FROM organizations o
LEFT JOIN saas_products sp ON o.subscription_product_id = sp.id
ORDER BY o.name;

-- 2. Check what modules exist for Barbería's product
SELECT 
    sp.name as product_name,
    sm.name as module_name,
    sm.key as module_key
FROM saas_products sp
JOIN saas_product_modules spm ON sp.id = spm.product_id
JOIN system_modules sm ON spm.module_id = sm.id
WHERE sp.name LIKE '%Barber%' OR sp.name LIKE '%Cortes%'
ORDER BY sp.name, sm.name;

-- 3. Check ALL saas_product_modules relationships
SELECT 
    sp.name as product,
    COUNT(*) as module_count,
    STRING_AGG(sm.key, ', ') as modules
FROM saas_products sp
LEFT JOIN saas_product_modules spm ON sp.id = spm.product_id
LEFT JOIN system_modules sm ON spm.module_id = sm.id
GROUP BY sp.id, sp.name
ORDER BY sp.name;
