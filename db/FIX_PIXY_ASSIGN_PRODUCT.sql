-- ================================================================
-- FIX: Assign SaaS Product to Pixy Agency
-- ================================================================
-- Problem: Pixy has subscription_product_id = NULL
-- Solution: Assign a product with all modules
-- ================================================================

-- STEP 1: Check available SaaS products
SELECT 
    id,
    name,
    description,
    (SELECT COUNT(*) FROM saas_product_modules spm WHERE spm.product_id = sp.id) as module_count,
    (SELECT STRING_AGG(sm.key, ', ') 
     FROM saas_product_modules spm 
     JOIN system_modules sm ON spm.module_id = sm.id 
     WHERE spm.product_id = sp.id) as modules
FROM saas_products sp
ORDER BY module_count DESC;

-- STEP 2: Create "Pixy Complete" product if it doesn't exist
-- (Or use an existing one with all modules)

DO $$
DECLARE
    pixy_product_id UUID;
    pixy_org_id UUID;
BEGIN
    -- Get Pixy's organization ID
    SELECT id INTO pixy_org_id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1;
    
    -- Check if "Pixy Complete" product exists
    SELECT id INTO pixy_product_id FROM saas_products WHERE name = 'Pixy Complete' LIMIT 1;
    
    -- If it doesn't exist, create it
    IF pixy_product_id IS NULL THEN
        INSERT INTO saas_products (name, description, price)
        VALUES ('Pixy Complete', 'Full access to all modules for Pixy Agency', 0)
        RETURNING id INTO pixy_product_id;
        
        -- Assign ALL modules to this product
        INSERT INTO saas_product_modules (product_id, module_id)
        SELECT pixy_product_id, id
        FROM system_modules;
        
        RAISE NOTICE 'Created Pixy Complete product with ID: %', pixy_product_id;
    END IF;
    
    -- Assign product to Pixy Agency
    UPDATE organizations
    SET subscription_product_id = pixy_product_id
    WHERE id = pixy_org_id;
    
    RAISE NOTICE 'Assigned product % to Pixy Agency (org: %)', pixy_product_id, pixy_org_id;
END $$;

-- STEP 3: Verify the assignment
SELECT 
    o.name as org_name,
    o.subscription_product_id,
    sp.name as product_name,
    (SELECT COUNT(*) 
     FROM saas_product_modules spm 
     WHERE spm.product_id = sp.id) as module_count
FROM organizations o
LEFT JOIN saas_products sp ON o.subscription_product_id = sp.id
WHERE o.name = 'Pixy Agency';

-- STEP 4: Test the RPC function again
SELECT * FROM get_org_modules_with_fallback(
    (SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1)
);

-- ================================================================
-- EXPECTED RESULT
-- ================================================================
-- Step 3: Should show Pixy Agency with "Pixy Complete" product
-- Step 4: Should return ALL module keys (not just core_clients, core_settings)
-- ================================================================

-- ================================================================
-- NEXT STEPS
-- ================================================================
-- After running this:
-- 1. Logout from the application
-- 2. Login again as Pixy
-- 3. Check sidebar → All modules should appear
-- ================================================================
