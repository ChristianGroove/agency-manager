-- Dynamic Portal Modules Configuration
-- Enables module-based navigation in client portal

-- 1. Add portal visibility configuration to system_modules
ALTER TABLE public.system_modules
  ADD COLUMN IF NOT EXISTS has_client_portal_view BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_tab_label TEXT,
  ADD COLUMN IF NOT EXISTS portal_icon_key TEXT;

-- 2. Configure existing modules for portal visibility

-- Invoicing Module (Billing/Payments)
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Pagos',
  portal_icon_key = 'CreditCard'
WHERE slug = 'module_invoicing';

-- Briefings Module (Projects)
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Proyectos',
  portal_icon_key = 'Layers'
WHERE slug = 'module_briefings';

-- Services Module
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Mis Servicios',
  portal_icon_key = 'Server'
WHERE slug = 'core_services';

-- Catalog Module (Explore)
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Explorar',
  portal_icon_key = 'Search'
WHERE slug = 'module_catalog';

-- Meta Insights (if exists)
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Insights',
  portal_icon_key = 'BarChart3'
WHERE slug = 'meta_insights';

-- 3. Verify configuration
SELECT 
  slug,
  name,
  has_client_portal_view,
  portal_tab_label,
  portal_icon_key
FROM public.system_modules
WHERE has_client_portal_view = true
ORDER BY slug;
