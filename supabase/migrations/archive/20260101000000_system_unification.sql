-- ============================================
-- SYSTEM UNIFICATION: Clarify Apps vs Catalog
-- Date: 2026-01-01
-- Purpose: Add display names and vertical connections
-- ============================================

-- 1. Add display_name columns for UI flexibility
ALTER TABLE public.saas_apps
ADD COLUMN IF NOT EXISTS display_name_singular TEXT DEFAULT 'Solution Template',
ADD COLUMN IF NOT EXISTS display_name_plural TEXT DEFAULT 'Solution Templates';

COMMENT ON COLUMN public.saas_apps.display_name_singular IS 'UI label for single template (e.g., "Solution Template")';
COMMENT ON COLUMN public.saas_apps.display_name_plural IS 'UI label for multiple templates (e.g., "Solution Templates")';

-- 2. Update module_catalog to have clear naming
UPDATE public.system_modules
SET 
    name = 'Product Catalog',
    description = 'Create and manage your product and service catalog. Perfect for agencies, consultants, and service providers to showcase offerings to clients.'
WHERE key = 'module_catalog';

-- 3. Add recommended_for_verticals to saas_apps (matches template to business type)
ALTER TABLE public.saas_apps
ADD COLUMN IF NOT EXISTS recommended_for_verticals TEXT[] DEFAULT ARRAY['*'];

COMMENT ON COLUMN public.saas_apps.recommended_for_verticals IS 'Array of vertical slugs this template is recommended for. Use [*] for universal templates.';

-- 4. Update existing templates with vertical recommendations
-- Use UPDATE instead of INSERT since apps already exist
UPDATE public.saas_apps
SET recommended_for_verticals = ARRAY['agency', 'marketing', 'creative', 'consulting']
WHERE slug = 'marketing-agency-starter';

UPDATE public.saas_apps
SET recommended_for_verticals = ARRAY['cleaning', 'maintenance', 'home-services']
WHERE slug = 'cleaning-business-pro';

UPDATE public.saas_apps
SET recommended_for_verticals = ARRAY['consulting', 'professional-services', 'coaching']
WHERE slug = 'consulting-firm-essential';

-- 5. Create view for template-to-modules relationship
CREATE OR REPLACE VIEW public.v_template_modules AS
SELECT DISTINCT
    a.id as template_id,
    a.name as template_name,
    a.slug as template_slug,
    a.recommended_for_verticals,
    am.module_key,
    sm.name as module_name,
    sm.description as module_description,
    sm.category as module_category,
    sm.is_core,
    sm.icon,
    sm.color
FROM public.saas_apps a
INNER JOIN public.saas_app_modules am ON am.app_id = a.id
LEFT JOIN public.system_modules sm ON sm.key = am.module_key
WHERE a.is_active = true;

COMMENT ON VIEW public.v_template_modules IS 'Shows which modules are included in each solution template';

-- 6. Create view for org-to-template relationship
CREATE OR REPLACE VIEW public.v_organization_templates AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.slug as organization_slug,
    a.id as template_id,
    a.name as template_name,
    a.slug as template_slug,
    a.category as template_category,
    a.price_monthly as template_price,
    o.app_activated_at,
    COALESCE(jsonb_array_length(o.manual_module_overrides), 0) as active_module_count
FROM public.organizations o
LEFT JOIN public.saas_apps a ON a.id = o.active_app_id
WHERE o.active_app_id IS NOT NULL;

COMMENT ON VIEW public.v_organization_templates IS 'Shows which organizations are using which solution templates';

-- 7. Create function to get recommended templates for a vertical
CREATE OR REPLACE FUNCTION public.get_recommended_templates_for_vertical(
    p_vertical TEXT
) RETURNS TABLE (
    template_id TEXT,
    template_name TEXT,
    template_slug TEXT,
    template_category TEXT,
    price_monthly DECIMAL,
    module_count INTEGER,
    match_score INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.slug,
        a.category,
        a.price_monthly,
        (SELECT COUNT(*) FROM public.saas_app_modules WHERE app_id = a.id)::INTEGER as module_count,
        CASE 
            WHEN a.recommended_for_verticals @> ARRAY[p_vertical] THEN 100
            WHEN a.recommended_for_verticals @> ARRAY['*'] THEN 50
            ELSE 0
        END as match_score
    FROM public.saas_apps a
    WHERE a.is_active = true
    AND (
        a.recommended_for_verticals @> ARRAY[p_vertical]
        OR a.recommended_for_verticals @> ARRAY['*']
    )
    ORDER BY match_score DESC, a.price_monthly ASC;
END;
$$;

COMMENT ON FUNCTION public.get_recommended_templates_for_vertical IS 'Returns solution templates recommended for a specific business vertical, with match scoring';

-- 8. Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_saas_apps_recommended_verticals 
ON public.saas_apps USING GIN(recommended_for_verticals);

CREATE INDEX IF NOT EXISTS idx_organizations_active_app 
ON public.organizations(active_app_id) WHERE active_app_id IS NOT NULL;

-- 9. Update table comments for clarity
COMMENT ON TABLE public.saas_apps IS 'Solution Templates: Pre-configured bundles of modules designed for specific business verticals (e.g., Marketing Agency Starter)';
COMMENT ON TABLE public.saas_app_modules IS 'Modules included in each solution template';
COMMENT ON TABLE public.saas_app_add_ons IS 'Optional add-on modules that can be purchased separately for templates';

-- Migration complete
-- Added: display_name columns, recommended_for_verticals, views, and recommendation function
