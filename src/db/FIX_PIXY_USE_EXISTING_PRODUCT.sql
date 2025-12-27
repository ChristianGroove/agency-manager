/* ================================================================
   SIMPLE FIX: Assign existing product to Pixy Agency
   ================================================================
   Strategy: Use an existing product that already has modules
   instead of creating a new one
   ================================================================ */

/* STEP 1: Find a product with most modules assigned */
SELECT 
    sp.id,
    sp.name,
    sp.slug,
    sp.pricing_model,
    COUNT(spm.module_id) as module_count,
    STRING_AGG(sm.key, ', ' ORDER BY sm.key) as modules
FROM saas_products sp
LEFT JOIN saas_product_modules spm ON sp.id = spm.product_id
LEFT JOIN system_modules sm ON spm.module_id = sm.id
GROUP BY sp.id, sp.name, sp.slug, sp.pricing_model
ORDER BY module_count DESC
LIMIT 5;

/* STEP 2: Assign the product with most modules to Pixy Agency */
UPDATE organizations
SET subscription_product_id = (
    SELECT sp.id
    FROM saas_products sp
    LEFT JOIN saas_product_modules spm ON sp.id = spm.product_id
    GROUP BY sp.id
    ORDER BY COUNT(spm.module_id) DESC
    LIMIT 1
)
WHERE name = 'Pixy Agency';

/* STEP 3: Verify the assignment */
SELECT 
    o.name as org_name,
    sp.name as product_name,
    sp.slug as product_slug,
    COUNT(spm.module_id) as module_count,
    STRING_AGG(sm.key, ', ' ORDER BY sm.key) as modules
FROM organizations o
LEFT JOIN saas_products sp ON o.subscription_product_id = sp.id
LEFT JOIN saas_product_modules spm ON sp.id = spm.product_id
LEFT JOIN system_modules sm ON spm.module_id = sm.id
WHERE o.name = 'Pixy Agency'
GROUP BY o.name, sp.name, sp.slug;

/* STEP 4: Test RPC function */
SELECT * FROM get_org_modules_with_fallback(
    (SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1)
) ORDER BY module_key;
