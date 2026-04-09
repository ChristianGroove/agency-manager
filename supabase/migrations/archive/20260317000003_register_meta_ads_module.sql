-- Register the new Meta Ads Dedicated Module in System Modules
-- This allows the module to be toggled in the SaaS Engine (Space Management)

INSERT INTO public.system_modules (
    key, 
    name, 
    description, 
    category, 
    price_monthly, 
    icon, 
    color,
    display_order,
    is_premium,
    requires_configuration
) VALUES (
    'module_meta_ads',
    'Meta Ads Monitor (Premium)',
    'Monitoreo avanzado de campañas, métricas en tiempo real y enriquecimiento de leads desde Meta Ads.',
    'add_on',
    49.00,
    'BarChart3',
    '#0081FB',
    25,
    true,
    true
) ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    price_monthly = EXCLUDED.price_monthly,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_premium = EXCLUDED.is_premium,
    requires_configuration = EXCLUDED.requires_configuration,
    display_order = EXCLUDED.display_order;

-- Rename or clarify the old legacy meta_insights to avoid confusion
UPDATE public.system_modules
SET 
    name = 'Legacy Meta Insights (Deprecated)',
    description = 'Antigua integración de métricas de Meta. Se recomienda usar Meta Ads Monitor (Premium).',
    display_order = 99
WHERE key = 'meta_insights';
