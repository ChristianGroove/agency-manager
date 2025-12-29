-- Migration: Remove Legacy Cleaning App Bundle (Cleanup for Cleanity2)
-- ID: 20251228_remove_legacy_cleaning_bundle

DO $$ 
DECLARE 
    legacy_product_id UUID;
BEGIN
    -- 1. Identify and Delete the Legacy Product
    -- This should CASCADE DELETE from saas_product_modules and organization_saas_products
    SELECT id INTO legacy_product_id FROM saas_products WHERE slug = 'cleaning-app';
    
    IF legacy_product_id IS NOT NULL THEN
        -- 1a. Unlink product from Organizations (Fixes FK Constraint Error)
        -- We set subscription_product_id to NULL (Free/None) or you could set to a default Agency Plan
        UPDATE organizations 
        SET subscription_product_id = NULL 
        WHERE subscription_product_id = legacy_product_id;

        -- 1b. Delete the product
        DELETE FROM saas_products WHERE id = legacy_product_id;
        RAISE NOTICE 'Deleted legacy product: cleaning-app (%)', legacy_product_id;
    END IF;

    -- 2. Remove Legacy Modules from Organization Assignments
    -- We explicitly remove them from any organization to ensure they disappear from sidebars.
    -- Modules: 'module_workforce', 'module_field_ops'
    -- Note: organization_modules uses 'module_key', not 'module_id' (based on error report)
    DELETE FROM organization_modules 
    WHERE module_key IN ('module_workforce', 'module_field_ops');
    
    -- 3. Deactivate/Delete the System Modules themselves
    -- We mark them inactive first or delete if we are sure. 
    -- User said "esa app debe desaparecer y con el sus modulos".
    DELETE FROM system_modules WHERE key IN ('module_workforce', 'module_field_ops');

    RAISE NOTICE 'Cleanup complete. Legacy Cleaning App and Modules removed.';
END $$;
