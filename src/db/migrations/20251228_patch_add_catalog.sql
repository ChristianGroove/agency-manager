-- Add module_catalog to Cleaning Vertical Bundle
-- User reported missing catalog visibility.

DO $$ 
DECLARE 
    v_product_id UUID;
    v_mod_catalog UUID;
BEGIN
    -- 1. Get Product ID
    SELECT id INTO v_product_id FROM saas_products WHERE slug = 'cleaning-app';
    
    -- 2. Ensure Catalog Module Exists
    INSERT INTO system_modules (key, name, description, category, is_active)
    VALUES ('module_catalog', 'Catálogo de Servicios', 'Gestión de portafolio de servicios y productos.', 'addon', true)
    ON CONFLICT (key) DO UPDATE SET is_active = true
    RETURNING id INTO v_mod_catalog;

    -- 3. Link if Product exists
    IF v_product_id IS NOT NULL THEN
        INSERT INTO saas_product_modules (product_id, module_id, is_default_enabled)
        VALUES (v_product_id, v_mod_catalog, true)
        ON CONFLICT (product_id, module_id) DO NOTHING;
        
        RAISE NOTICE 'Added module_catalog to Cleaning App';
    END IF;
END $$;
