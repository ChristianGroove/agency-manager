-- SCRIPT COMPLETO: Configuración Final del Portal
-- Ejecuta todo esto de una vez

-- 1. Desactivar "Proyectos" (duplicado)
UPDATE public.system_modules 
SET has_client_portal_view = false
WHERE key = 'module_briefings';

-- 2. Crear módulo "Insights" con categoría correcta
INSERT INTO public.system_modules (key, name, description, category, is_active, has_client_portal_view, portal_tab_label, portal_icon_key)
VALUES (
    'meta_insights',
    'Meta Insights',
    'Facebook & Instagram advertising analytics and insights',
    'addon',
    true,
    true,
    'Insights',
    'BarChart3'
)
ON CONFLICT (key) DO UPDATE SET
    has_client_portal_view = true,
    portal_tab_label = 'Insights',
    portal_icon_key = 'BarChart3';

-- 3. Verificar configuración final
SELECT key, name, category, portal_tab_label, portal_icon_key
FROM public.system_modules
WHERE has_client_portal_view = true
ORDER BY portal_tab_label;
