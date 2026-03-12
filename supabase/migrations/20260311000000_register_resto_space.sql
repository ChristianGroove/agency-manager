-- ==============================================================================
-- RUN THIS FILE MANUALLY IN THE SUPABASE SQL EDITOR
-- This seed will officially register the "Resto Bar" Space in the Spaces Registry
-- and attach its core components for Food & Beverage operations.
-- ==============================================================================

-- 1. Insert the 'Resto' Space into the SaaS Apps registry
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
    sort_order,
    space_category
)
VALUES (
    'app_resto',
    'Resto Bar Business',
    'resto',
    'Sistema integral para restaurantes, bares y cafeterías.',
    'Transforma tu restaurante con un menú digital interactivo, gestión de comensales y automatización de pedidos por chat.',
    'food_and_beverage',
    ARRAY['resto', 'food', 'beverage', 'hospitality'],
    'Utensils',
    '#ec4899', -- Brand Pink
    39.00,
    14,
    true,
    true,
    4,
    'resto'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    space_category = EXCLUDED.space_category;

-- 2. Clean and link the core modules for Resto
DELETE FROM public.saas_app_modules WHERE app_id = 'app_resto';

INSERT INTO public.saas_app_modules (
    app_id,
    module_key,
    auto_enable,
    is_core,
    is_optional,
    sort_order
)
VALUES
    ('app_resto', 'module_orders', true, true, false, 10),
    ('app_resto', 'module_digital_menu', true, true, false, 20),
    ('app_resto', 'core_crm', true, true, false, 30),
    ('app_resto', 'core_clients', true, true, false, 40),
    ('app_resto', 'module_messaging', true, true, false, 50),
    ('app_resto', 'module_marketing', false, false, true, 60),
    ('app_resto', 'module_invoicing', false, false, true, 70);
