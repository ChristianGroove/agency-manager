-- Disable "Proyectos" module (duplicate of Mis Servicios)
-- Keep only "Mis Servicios" which shows the same content

UPDATE public.system_modules 
SET has_client_portal_view = false
WHERE key = 'module_briefings';

-- Verify the change
SELECT key, name, has_client_portal_view, portal_tab_label
FROM public.system_modules
WHERE key = 'module_briefings';
