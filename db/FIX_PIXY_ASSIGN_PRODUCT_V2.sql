/* ================================================================
   FIX: Assign SaaS Product to Pixy Agency (CORRECTED)
   ================================================================ */

/* STEP 1: Check available SaaS products */
SELECT 
    id,
    name,
    description,
    (SELECT COUNT(*) FROM saas_product_modules spm WHERE spm.product_id = sp.id) as module_count
FROM saas_products sp
ORDER BY module_count DESC;

/* STEP 2: Create Pixy Complete product and assign to Pixy Agency */
DO $$
DECLARE
    pixy_product_id UUID;
    pixy_org_id UUID;
BEGIN
    /* Get Pixy's organization ID */
    SELECT id INTO pixy_org_id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1;
    
    /* Check if Pixy Complete product exists */
    SELECT id INTO pixy_product_id FROM saas_products WHERE name = 'Pixy Complete' LIMIT 1;
    
    /* If it doesn't exist, create it - REMOVED price column */
    IF pixy_product_id IS NULL THEN
        INSERT INTO saas_products (name, description)
        VALUES ('Pixy Complete', 'Full access to all modules for Pixy Agency')
        RETURNING id INTO pixy_product_id;
        
        /* Assign ALL modules to this product */
        INSERT INTO saas_product_modules (product_id, module_id)
        SELECT pixy_product_id, id
        FROM system_modules;
        
        RAISE NOTICE 'Created Pixy Complete product with ID: %', pixy_product_id;
    END IF;
    
    /* Assign product to Pixy Agency */
    UPDATE organizations
    SET subscription_product_id = pixy_product_id
    WHERE id = pixy_org_id;
    
    RAISE NOTICE 'Assigned product % to Pixy Agency (org: %)', pixy_product_id, pixy_org_id;
END $$;

/* STEP 3: Verify the assignment */
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

/* STEP 4: Test the RPC function */
SELECT * FROM get_org_modules_with_fallback(
    (SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1)
);
