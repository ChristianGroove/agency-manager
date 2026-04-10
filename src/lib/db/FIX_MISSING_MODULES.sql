-- FIX: Add missing modules to system_modules and assign to Pixy

-- Step 1: Ensure ALL required modules exist in system_modules
INSERT INTO system_modules (key, name, description, category, is_active)
VALUES 
    ('core_hosting', 'Contratos', 'Gestión de servicios de hosting y contratos', 'core', true),
    ('module_quotes', 'Cotizaciones', 'Sistema de cotizaciones y propuestas', 'addon', true),
    ('module_payments', 'Pagos', 'Gestión de pagos y transacciones', 'addon', true),
    ('core_settings', 'Configuración', 'Configuración del sistema', 'core', true)
ON CONFLICT (key) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = true;

-- Step 2: Get Pixy's package and link ALL modules
DO $$
DECLARE
    pkg_id UUID;
    m RECORD;
    linked_count INT := 0;
BEGIN
    -- Get Pixy's package
    SELECT id INTO pkg_id 
    FROM saas_products 
    WHERE name = 'Complete SaaS Package - Pixy' 
    LIMIT 1;
    
    IF pkg_id IS NULL THEN
        RAISE EXCEPTION 'Pixy package not found!';
    END IF;
    
    RAISE NOTICE 'Pixy Package ID: %', pkg_id;
    
    -- Link ALL modules to the package
    FOR m IN SELECT id, key, name FROM system_modules WHERE is_active = true LOOP
        INSERT INTO saas_product_modules (product_id, module_id)
        VALUES (pkg_id, m.id)
        ON CONFLICT (product_id, module_id) DO NOTHING;
        
        linked_count := linked_count + 1;
        RAISE NOTICE '  ✓ %', m.key;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total modules linked: %', linked_count;
    RAISE NOTICE '===========================================';
END $$;

-- Step 3: Verify Pixy has all modules
SELECT 
    sm.key,
    sm.name,
    sm.category,
    CASE WHEN spm.product_id IS NOT NULL THEN '✓ ASSIGNED' ELSE '✗ MISSING' END as status
FROM system_modules sm
LEFT JOIN saas_product_modules spm ON sm.id = spm.module_id
LEFT JOIN saas_products sp ON spm.product_id = sp.id AND sp.name = 'Complete SaaS Package - Pixy'
WHERE sm.is_active = true
ORDER BY sm.category, sm.key;
