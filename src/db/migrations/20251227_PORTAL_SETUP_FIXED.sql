-- COMPLETE PORTAL SETUP (FIXED VERSION)
-- Execute this in Supabase SQL Editor

-- PART 1: Add portal configuration columns to system_modules
ALTER TABLE public.system_modules
  ADD COLUMN IF NOT EXISTS has_client_portal_view BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_tab_label TEXT,
  ADD COLUMN IF NOT EXISTS portal_icon_key TEXT;

-- PART 2: Configure modules by ID or name (adjust based on your actual column)
-- First, let's see what modules exist:
SELECT id, name FROM public.system_modules LIMIT 10;

-- UNCOMMENT AND RUN THESE AFTER YOU KNOW THE CORRECT IDs:
-- Replace 'YOUR_MODULE_ID_HERE' with actual IDs from the query above

/*
-- Invoicing Module
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Pagos',
  portal_icon_key = 'CreditCard'
WHERE name ILIKE '%invoic%' OR name ILIKE '%billing%' OR name ILIKE '%payment%';

-- Briefings Module
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Proyectos',
  portal_icon_key = 'Layers'
WHERE name ILIKE '%briefing%' OR name ILIKE '%project%';

-- Services Module
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Mis Servicios',
  portal_icon_key = 'Server'
WHERE name ILIKE '%service%';

-- Catalog Module
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Explorar',
  portal_icon_key = 'Search'
WHERE name ILIKE '%catalog%' OR name ILIKE '%portfolio%';

-- Insights Module
UPDATE public.system_modules SET 
  has_client_portal_view = true,
  portal_tab_label = 'Insights',
  portal_icon_key = 'BarChart3'
WHERE name ILIKE '%insight%' OR name ILIKE '%analytics%';
*/

-- PART 3: Add super admin flag
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS show_all_portal_modules BOOLEAN DEFAULT false;

-- PART 4: Enable for Pixy Agency
UPDATE public.organization_settings
SET show_all_portal_modules = true
WHERE organization_id IN (
    SELECT id FROM public.organizations 
    WHERE name ILIKE '%pixy%' 
    LIMIT 1
);

-- PART 5: Verify what we have
SELECT 'Step 1: Modules with portal view' as info;
SELECT name, has_client_portal_view, portal_tab_label 
FROM public.system_modules 
WHERE has_client_portal_view = true;

SELECT 'Step 2: Super admin orgs' as info;
SELECT o.name, os.show_all_portal_modules
FROM public.organizations o
JOIN public.organization_settings os ON o.id = os.organization_id
WHERE os.show_all_portal_modules = true;
