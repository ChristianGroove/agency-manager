-- ==============================================================================
-- RUN THIS FILE MANUALLY IN THE SUPABASE SQL EDITOR
-- This seed will officially create the "Retail Workspace" in the Spaces Registry
-- and attach its corresponding Core and Optional Modules.
-- ==============================================================================

-- 1. Insert the newly crafted 'Retail' Space into the SaaS Apps registry
INSERT INTO public.saas_apps (
    id,
    name,
    slug,
    description,
    long_description,
    category,
    vertical_compatibility,
    icon,
    color,
    price_monthly,
    trial_days,
    is_active,
    is_featured,
    sort_order
)
VALUES (
    'app_retail',
    'Retail Workspace',
    'retail',
    'Sistema operativo físico para comercios, tiendas retail y cadenas.',
    'Equipa a tus puntos físicos con control de asistencia fotográfica geocercada, gestión multi-sucursales, CRM y facturación centralizada.',
    'commerce',
    ARRAY['retail', 'commerce', 'general'],
    'Store',
    '#f97316', -- Naranja llamativo
    49.00,
    14,
    true,
    true,
    3
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 2. Link the core and optional modules strictly for this new Retail Space
INSERT INTO public.saas_app_modules (
    app_id,
    module_key,
    auto_enable,
    is_core,
    is_optional,
    sort_order
)
VALUES
    -- 2.1 The New Retail Specific Modules
    ('app_retail', 'core_locations', true, true, false, 10),
    ('app_retail', 'module_attendance', true, true, false, 20),
    
    -- 2.2 The General Ecosystem required for operations
    ('app_retail', 'core_crm', true, true, false, 30),
    ('app_retail', 'core_clients', true, true, false, 40),
    
    -- 2.3 Optional Tools
    ('app_retail', 'module_invoicing', false, false, true, 50),
    ('app_retail', 'module_manifests', false, false, true, 60),
    ('app_retail', 'module_automation', false, false, true, 70),
    ('app_retail', 'module_messaging', false, false, true, 80)
ON CONFLICT DO NOTHING; -- Assuming id is UUID DEFAULT gen_random_uuid(), but if no unique constraint, this just runs.
-- Note: if saas_app_modules does NOT have a unique constraint on (app_id, module_key), running this multiple times could duplicate.
-- To be safe, we delete first:

DELETE FROM public.saas_app_modules WHERE app_id = 'app_retail';

INSERT INTO public.saas_app_modules (
    app_id,
    module_key,
    auto_enable,
    is_core,
    is_optional,
    sort_order
)
VALUES
    ('app_retail', 'core_locations', true, true, false, 10),
    ('app_retail', 'module_attendance', true, true, false, 20),
    ('app_retail', 'core_crm', true, true, false, 30),
    ('app_retail', 'core_clients', true, true, false, 40),
    ('app_retail', 'module_invoicing', false, false, true, 50),
    ('app_retail', 'module_manifests', false, false, true, 60),
    ('app_retail', 'module_automation', false, false, true, 70),
    ('app_retail', 'module_messaging', false, false, true, 80);
