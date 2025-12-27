-- COMPLETE PORTAL SETUP - Execute this ONCE in Supabase
-- This combines both migrations for convenience

-- PART 1: Add portal configuration to system_modules
ALTER TABLE public.system_modules
  ADD COLUMN IF NOT EXISTS has_client_portal_view BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_tab_label TEXT,
  ADD COLUMN IF NOT EXISTS portal_icon_key TEXT;

-- PART 2: Seed modules with portal configuration
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Pagos',
  portal_icon_key = 'CreditCard'
WHERE slug = 'module_invoicing';

UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Proyectos',
  portal_icon_key = 'Layers'
WHERE slug = 'module_briefings';

UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Mis Servicios',
  portal_icon_key = 'Server'
WHERE slug = 'core_services';

UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Explorar',
  portal_icon_key = 'Search'
WHERE slug = 'module_catalog';

UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Insights',
  portal_icon_key = 'BarChart3'
WHERE slug = 'meta_insights';

-- PART 3: Add super admin flag to organization_settings
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS show_all_portal_modules BOOLEAN DEFAULT false;

-- PART 4: Enable ALL modules for Pixy Agency (Super Admin)
UPDATE public.organization_settings
SET show_all_portal_modules = true
WHERE organization_id IN (
    SELECT id FROM public.organizations 
    WHERE name ILIKE '%pixy%' 
    LIMIT 1
);

-- PART 5: Verify setup
SELECT 
    'Modules Configured' as step,
    COUNT(*) as count
FROM public.system_modules
WHERE has_client_portal_view = true

UNION ALL

SELECT 
    'Super Admin Orgs' as step,
    COUNT(*) as count
FROM public.organization_settings
WHERE show_all_portal_modules = true;
