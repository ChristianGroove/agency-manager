-- ============================================
-- CREACIÓN DEL SAAS SPACE (PLATAFORMA DE SERVICIOS)
-- ============================================

-- 1. Registro de la App en el catálogo
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
    is_active, 
    is_featured,
    sort_order,
    space_category
) VALUES (
    'app_saas_platform', 
    'SaaS Business Platform', 
    'saas-platform', 
    'Optimiza tu plataforma de servicios con herramientas automatizadas de gestión.',
    'Una solución integral diseñada para empresas de software y servicios digitales. Incluye gestión avanzada de clientes, flujos de trabajo automatizados y un dashboard adaptativo para maximizar la eficiencia operativa.',
    'software', 
    ARRAY['software', 'saas', 'services', '*'], 
    'Zap', -- Icono de Lucide (Rayo/Automatización)
    '#8b5cf6', -- Violeta/SaaS
    0, 
    true, 
    true, -- Featured para que aparezca primero
    0,
    'saas' -- Categoría para el Dashboard
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    long_description = EXCLUDED.long_description,
    space_category = EXCLUDED.space_category;

-- 2. Configuración de Módulos por Defecto
-- Activamos CRM, Facturación y Mensajería (Inbox)
INSERT INTO public.saas_app_modules (app_id, module_key, auto_enable, is_core) VALUES
('app_saas_platform', 'core_clients', true, true),
('app_saas_platform', 'core_settings', true, true),
('app_saas_platform', 'module_quotes', true, false),
('app_saas_platform', 'module_invoicing', true, false),
('app_saas_platform', 'module_payments', true, false),
('app_saas_platform', 'module_messaging', true, false) -- Inbox/WhatsApp
ON CONFLICT (app_id, module_key) DO NOTHING;

-- 3. Registro de Banner de Bienvenida (Opcional pero recomendado en el manual)
INSERT INTO public.global_dashboard_banners (
    title, 
    description, 
    space_type, 
    is_active, 
    cta_text, 
    cta_url
) VALUES (
    'Bienvenido a SaaS Space',
    '["Has activado el motor de alta eficiencia para plataformas de servicios.", "Empieza configurando tus primeros flujos."]',
    'saas',
    true,
    'Configurar',
    '/settings'
) ON CONFLICT (space_type) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;
