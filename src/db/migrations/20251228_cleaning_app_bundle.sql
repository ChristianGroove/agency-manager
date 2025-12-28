-- Bundle Creation: Cleaning Vertical App
-- Migration ID: 20251228_cleaning_app_bundle

DO $$ 
DECLARE 
    product_id UUID;
    mod_wf UUID;
    mod_ops UUID;
    mod_appt UUID;
    mod_client UUID;
    mod_sett UUID; 
BEGIN
    -- 1. Ensure Modules Exist (Idempotent)
    INSERT INTO system_modules (key, name, description, category, is_active)
    VALUES
        ('module_workforce', 'Gestión de Personal', 'Permite configurar tarifas y skills del staff.', 'addon', true),
        ('module_field_ops', 'Operaciones de Campo', 'Mapa y Timeline de servicios.', 'addon', true),
        ('module_appointments', 'Citas y Reservas', 'Gestión base de citas con contexto espacial.', 'core', true)
    ON CONFLICT (key) DO UPDATE SET is_active = true;

    -- 2. Create Product Bundle
    INSERT INTO saas_products (name, slug, description, pricing_model, base_price, status)
    VALUES ('Cleaning Vertical', 'cleaning-app', 'Solución llave en mano para empresas de limpieza.', 'subscription', 29.00, 'published')
    ON CONFLICT (slug) DO UPDATE SET 
        base_price = 29.00,
        description = 'Solución llave en mano para empresas de limpieza.'
    RETURNING id INTO product_id;

    -- 3. Resolve Module IDs
    SELECT id INTO mod_wf FROM system_modules WHERE key = 'module_workforce';
    SELECT id INTO mod_ops FROM system_modules WHERE key = 'module_field_ops';
    SELECT id INTO mod_appt FROM system_modules WHERE key = 'module_appointments';
    SELECT id INTO mod_client FROM system_modules WHERE key = 'core_clients';
    SELECT id INTO mod_sett FROM system_modules WHERE key = 'core_settings';

    -- 4. Link Modules to Product (Enable them by default for this product)
    INSERT INTO saas_product_modules (product_id, module_id, is_default_enabled)
    VALUES 
        (product_id, mod_wf, true),
        (product_id, mod_ops, true),
        (product_id, mod_appt, true),
        (product_id, mod_client, true)
    ON CONFLICT (product_id, module_id) DO NOTHING;
    
    -- Link Core Settings (Optional but recommended)
    IF mod_sett IS NOT NULL THEN
        INSERT INTO saas_product_modules (product_id, module_id, is_default_enabled)
        VALUES (product_id, mod_sett, true)
        ON CONFLICT (product_id, module_id) DO NOTHING;
    END IF;

    RAISE NOTICE 'Cleaning App Product Created with ID: %', product_id;
END $$;
