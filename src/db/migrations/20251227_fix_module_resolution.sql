-- ================================================================
-- FIX: Subscription Module Resolution
-- ================================================================
-- Purpose: Create/replace RPC function to properly resolve modules
-- Chain: organization.subscription_product_id → saas_products → product_modules
-- ================================================================

-- Drop existing function if it exists (for idempotency)
DROP FUNCTION IF EXISTS get_org_modules_with_fallback(UUID);

-- Create the function that resolves modules from subscription
CREATE OR REPLACE FUNCTION get_org_modules_with_fallback(org_id UUID)
RETURNS TABLE (module_key TEXT) AS $$
BEGIN
    -- Try to get modules from organization's subscription_product_id
    RETURN QUERY
    SELECT DISTINCT sm.key::TEXT as module_key
    FROM organizations o
    JOIN saas_products sp ON o.subscription_product_id = sp.id
    JOIN saas_product_modules spm ON sp.id = spm.product_id
    JOIN system_modules sm ON spm.module_id = sm.id
    WHERE o.id = org_id;
    
    -- If no modules found (no subscription), return core modules
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT DISTINCT sm.key::TEXT as module_key
        FROM system_modules sm
        WHERE sm.key IN ('core_clients', 'core_settings');
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_org_modules_with_fallback(UUID) TO authenticated;

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Test for Pixy Agency (should have many modules)
SELECT * FROM get_org_modules_with_fallback(
    (SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1)
);

-- Test for organization with subscription
SELECT  
    o.name as org_name,
    sp.name as product_name,
    (SELECT COUNT(*) FROM get_org_modules_with_fallback(o.id)) as module_count,
    (SELECT STRING_AGG(module_key, ', ') FROM get_org_modules_with_fallback(o.id)) as modules
FROM organizations o
LEFT JOIN saas_products sp ON o.subscription_product_id = sp.id
ORDER BY o.name;

-- ================================================================
-- EXPECTED RESULT
-- ================================================================
-- Organizations with subscription → See modules from their product
-- Organizations without subscription → See core modules only
-- ================================================================
