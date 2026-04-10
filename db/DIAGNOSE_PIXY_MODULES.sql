-- ================================================================
-- CRITICAL DIAGNOSIS: Pixy's sidebar modules not showing
-- ================================================================
-- Purpose: Diagnose why modules aren't appearing in sidebar
-- ================================================================

-- 1. Check if Pixy has a subscription_product_id assigned
SELECT 
    id,
    name,
    subscription_product_id,
    created_at
FROM organizations 
WHERE name = 'Pixy Agency'
LIMIT 1;

-- 2. If subscription_product_id exists, check what product it points to
SELECT 
    o.name as org_name,
    o.subscription_product_id,
    sp.id as product_id,
    sp.name as product_name,
    sp.description
FROM organizations o
LEFT JOIN saas_products sp ON o.subscription_product_id = sp.id
WHERE o.name = 'Pixy Agency';

-- 3. Check what modules that product should have
SELECT 
    o.name as org_name,
    sp.name as product_name,
    sm.name as module_name,
    sm.key as module_key,
    sm.is_active as module_active
FROM organizations o
JOIN saas_products sp ON o.subscription_product_id = sp.id
JOIN saas_product_modules spm ON sp.id = spm.product_id
JOIN system_modules sm ON spm.module_id = sm.id
WHERE o.name = 'Pixy Agency'
ORDER BY sm.name;

-- 4. Test if the RPC function exists and works
SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_org_modules_with_fallback'
      AND n.nspname = 'public'
) as function_exists;

-- 5. If function exists, test it for Pixy
SELECT * FROM get_org_modules_with_fallback(
    (SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1)
);

-- ================================================================
-- EXPECTED RESULTS
-- ================================================================
-- Query 1: Should show subscription_product_id (UUID or NULL)
-- Query 2: Should show which product Pixy is subscribed to
-- Query 3: Should show list of modules (if product assigned)
-- Query 4: Should return true if function exists
-- Query 5: Should return module keys like 'module_catalog', 'module_invoicing', etc.
-- ================================================================

-- ================================================================
-- POSSIBLE ISSUES
-- ================================================================
-- A) subscription_product_id is NULL → Pixy not assigned to product
-- B) Product has no modules in saas_product_modules → Need to assign
-- C) Function doesn't exist → Need to run migration
-- D) Function exists but returns empty → Logic error
-- ================================================================
