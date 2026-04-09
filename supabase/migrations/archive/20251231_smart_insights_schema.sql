-- 1. Add insights_access to SERVICE CATALOG
ALTER TABLE public.service_catalog 
ADD COLUMN IF NOT EXISTS insights_access TEXT DEFAULT 'NONE' 
CHECK (insights_access IN ('NONE', 'ORGANIC', 'ADS', 'ALL'));

-- 2. Add insights_access to SERVICES (instances)
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS insights_access TEXT DEFAULT 'NONE' 
CHECK (insights_access IN ('NONE', 'ORGANIC', 'ADS', 'ALL'));

-- 3. Add portal_insights_settings to CLIENTS
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS portal_insights_settings JSONB DEFAULT '{}'::jsonb;

-- Comment on columns
COMMENT ON COLUMN public.service_catalog.insights_access IS 'Determines if this service grants access to Organic, Ads, or All insights in the portal.';
COMMENT ON COLUMN public.services.insights_access IS 'Inherited from catalog or manually set. Determines insights access.';
COMMENT ON COLUMN public.clients.portal_insights_settings IS 'Manual override for portal insights. { "override": boolean, "access_level": "..." }';
