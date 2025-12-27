-- COMPLETE PORTAL SETUP - CORRECTED VERSION
-- Based on actual system_modules structure

-- STEP 1: Add portal configuration columns
ALTER TABLE public.system_modules
  ADD COLUMN IF NOT EXISTS has_client_portal_view BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_tab_label TEXT,
  ADD COLUMN IF NOT EXISTS portal_icon_key TEXT;

-- STEP 2: Configure modules using the 'key' column (NOT slug)

-- Invoicing & Payments
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Pagos',
  portal_icon_key = 'CreditCard'
WHERE key = 'module_invoicing' OR name = 'Invoicing & Payments';

-- Briefing System
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Proyectos',
  portal_icon_key = 'Layers'
WHERE key = 'module_briefings' OR name = 'Briefing System';

-- Service Contracts (Mis Servicios)
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Mis Servicios',
  portal_icon_key = 'Server'
WHERE key = 'core_services' OR name = 'Service Contracts';

-- Product Catalog (Explorar)
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Explorar',
  portal_icon_key = 'Search'
WHERE key = 'module_catalog' OR name = 'Product Catalog';

-- Meta Insights (if it exists)
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Insights',
  portal_icon_key = 'BarChart3'
WHERE key = 'meta_insights';

-- STEP 3: Add super admin flag to organization_settings
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS show_all_portal_modules BOOLEAN DEFAULT false;

-- STEP 4: Enable ALL modules for Pixy Agency
UPDATE public.organization_settings
SET show_all_portal_modules = true
WHERE organization_id IN (
    SELECT id FROM public.organizations 
    WHERE name ILIKE '%pixy%' 
    LIMIT 1
);

-- STEP 5: Verify the setup
SELECT 
    '✅ Modules configured for portal' as status,
    COUNT(*) as count
FROM public.system_modules
WHERE has_client_portal_view = true;

SELECT 
    key,
    name,
    portal_tab_label,
    portal_icon_key
FROM public.system_modules
WHERE has_client_portal_view = true
ORDER BY key;

SELECT 
    '✅ Super admin organizations' as status,
    o.name as organization_name,
    os.show_all_portal_modules
FROM public.organizations o
JOIN public.organization_settings os ON o.id = os.organization_id
WHERE os.show_all_portal_modules = true;
