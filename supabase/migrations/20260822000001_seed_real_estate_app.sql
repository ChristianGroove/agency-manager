-- ==============================================================================
-- MIGRATION: 20260822000001_seed_real_estate_app.sql
-- PURPOSE: Provision Real Estate & PropTech Pro vertical app & linked modules
-- IDEMPOTENT: Safe to run multiple times
-- ==============================================================================

-- 1. Insert or update the SaaS App for Real Estate Pro
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
) VALUES (
    'app_real_estate_pro',
    'Real Estate & PropTech Pro',
    'real-estate-pro',
    'Gestión de propiedades, prospectos inmobiliarios y comercialización PropTech',
    'Solución integral para agencias inmobiliarias y empresas PropTech con catálogo de propiedades, cotizaciones, CRM de prospectos, mensajería y automatización.',
    'real_estate',
    ARRAY['real_estate', 'proptech', 'agency'],
    'Building2',
    '#0284c7',
    99.00,
    14,
    true,
    true,
    4
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    long_description = EXCLUDED.long_description,
    category = EXCLUDED.category,
    vertical_compatibility = EXCLUDED.vertical_compatibility,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    price_monthly = EXCLUDED.price_monthly,
    trial_days = EXCLUDED.trial_days,
    is_active = EXCLUDED.is_active,
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- 2. Link modules to Real Estate Pro app in saas_app_modules
INSERT INTO public.saas_app_modules (
    app_id,
    module_key,
    auto_enable,
    is_core,
    is_optional,
    sort_order
) VALUES
    ('app_real_estate_pro', 'core_crm', true, true, false, 1),
    ('app_real_estate_pro', 'core_clients', true, true, false, 2),
    ('app_real_estate_pro', 'core_locations', true, false, false, 3),
    ('app_real_estate_pro', 'module_messaging', true, false, false, 4),
    ('app_real_estate_pro', 'module_quotes', true, false, false, 5),
    ('app_real_estate_pro', 'module_catalog', true, false, false, 6),
    ('app_real_estate_pro', 'module_automation', true, false, false, 7)
ON CONFLICT (app_id, module_key) DO NOTHING;
