-- ============================================
-- FASE 3: SISTEMA DE APPS (TEMPLATES DE MÓDULOS)
-- Date: 2025-01-03
-- ============================================

-- 1. APPS CATALOG (Templates de módulos pre-configurados)
CREATE TABLE IF NOT EXISTS public.saas_apps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    long_description TEXT,
    category TEXT, -- 'agency', 'cleaning', 'realestate', 'consulting', 'general'
    vertical_compatibility TEXT[] DEFAULT ARRAY['*'], -- Verticals compatibles
    icon TEXT DEFAULT 'Package',
    color TEXT DEFAULT '#6366f1',
    banner_image_url TEXT,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    trial_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.saas_apps IS 'Catalog of pre-configured app templates (bundles of modules)';
COMMENT ON COLUMN public.saas_apps.vertical_compatibility IS 'Array of compatible verticals, or [*] for all';
COMMENT ON COLUMN public.saas_apps.metadata IS 'Additional metadata: target_audience, features_highlight, testimonials, etc.';

-- 2. APP MODULES (Módulos incluidos en cada app)
CREATE TABLE IF NOT EXISTS public.saas_app_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id TEXT REFERENCES public.saas_apps(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL, -- References system_modules.key
    auto_enable BOOLEAN DEFAULT TRUE, -- Si se activa automáticamente al asignar app
    is_core BOOLEAN DEFAULT FALSE, -- Core modules can't be disabled
    is_optional BOOLEAN DEFAULT FALSE, -- User can choose to enable/disable
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(app_id, module_key)
);

COMMENT ON TABLE public.saas_app_modules IS 'Modules included in each app template';
COMMENT ON COLUMN public.saas_app_modules.auto_enable IS 'Automatically enabled when app is assigned';
COMMENT ON COLUMN public.saas_app_modules.is_core IS 'Core modules are always enabled and cannot be disabled';
COMMENT ON COLUMN public.saas_app_modules.is_optional IS 'User can choose whether to enable this module';

-- 3. APP RECOMMENDED ADD-ONS (Recomendaciones de add-ons para cada app)
CREATE TABLE IF NOT EXISTS public.saas_app_add_ons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id TEXT REFERENCES public.saas_apps(id) ON DELETE CASCADE,
    add_on_type TEXT NOT NULL, -- 'branding', 'domain', 'analytics', etc.
    tier_id TEXT, -- Specific tier recommendation (e.g., 'custom', 'whitelabel')
    is_recommended BOOLEAN DEFAULT TRUE,
    is_required BOOLEAN DEFAULT FALSE,
    discount_percent DECIMAL(5,2) DEFAULT 0, -- Bundle discount
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(app_id, add_on_type, tier_id)
);

COMMENT ON TABLE public.saas_app_add_ons IS 'Recommended add-ons for each app';
COMMENT ON COLUMN public.saas_app_add_ons.discount_percent IS 'Discount percentage when bundled with app';

-- 4. ORGANIZATION APP ASSIGNMENT
-- Extend organizations table to track active app
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS active_app_id TEXT REFERENCES public.saas_apps(id),
ADD COLUMN IF NOT EXISTS app_activated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS app_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.active_app_id IS 'Currently active app template for this organization';
COMMENT ON COLUMN public.organizations.app_metadata IS 'App-specific configuration and customizations';

-- 5. SEED SAMPLE APPS

-- App 1: Marketing Agency Starter
INSERT INTO public.saas_apps (id, name, slug, description, long_description, category, vertical_compatibility, icon, color, price_monthly, trial_days, is_active, is_featured, sort_order) VALUES
(
    'app_marketing_starter',
    'Marketing Agency Starter',
    'marketing-agency-starter',
    'Everything you need to run a marketing agency',
    'Complete solution for marketing agencies with client management, quotes, portfolio showcase, and lead tracking. Perfect for agencies getting started.',
    'agency',
    ARRAY['agency', 'creative', 'consulting'],
    'Rocket',
    '#ec4899',
    49,
    14,
    true,
    true,
    1
);

-- App 2: Cleaning Business Pro
INSERT INTO public.saas_apps (id, name, slug, description, long_description, category, vertical_compatibility, icon, color, price_monthly, trial_days, is_active, is_featured, sort_order) VALUES
(
    'app_cleaning_pro',
    'Cleaning Business Pro',
    'cleaning-business-pro',
    'Manage cleaning jobs, staff, and operations',
    'Professional cleaning business management with job scheduling, staff management, operations tracking, and payroll integration.',
    'cleaning',
    ARRAY['cleaning', 'maintenance'],
    'Sparkles',
    '#10b981',
    79,
    14,
    true,
    true,
    2
);

-- App 3: Consulting Firm Essential
INSERT INTO public.saas_apps (id, name, slug, description, long_description, category, vertical_compatibility, icon, color, price_monthly, trial_days, is_active, is_featured, sort_order) VALUES
(
    'app_consulting_essential',
    'Consulting Firm Essential',
    'consulting-firm-essential',
    'Professional consulting practice management',
    'Essential tools for consulting firms including client management, quotes, briefings, and portfolio showcase.',
    'consulting',
    ARRAY['consulting', 'agency'],
    'Briefcase',
    '#3b82f6',
    59,
    14,
    true,
    FALSE,
    3
);

-- 6. SEED APP MODULES

-- Marketing Agency Starter modules
INSERT INTO public.saas_app_modules (app_id, module_key, auto_enable, is_core, is_optional, sort_order) VALUES
('app_marketing_starter', 'core_clients', true, true, false, 1),
('app_marketing_starter', 'core_settings', true, true, false, 2),
('app_marketing_starter', 'module_quotes', true, false, false, 3),
('app_marketing_starter', 'module_briefings', true, false, false, 4),
('app_marketing_starter', 'module_catalog', false, false, true, 5);  -- Optional

-- Cleaning Business Pro modules
INSERT INTO public.saas_app_modules (app_id, module_key, auto_enable, is_core, is_optional, sort_order) VALUES
('app_cleaning_pro', 'core_clients', true, true, false, 1),
('app_cleaning_pro', 'core_settings', true, true, false, 2),
('app_cleaning_pro', 'module_appointments', true, false, false, 3),
('app_cleaning_pro', 'module_invoicing', true, false, false, 4),
('app_cleaning_pro', 'module_payments', false, false, true, 5); -- Optional

-- Consulting Firm Essential modules
INSERT INTO public.saas_app_modules (app_id, module_key, auto_enable, is_core, is_optional, sort_order) VALUES
('app_consulting_essential', 'core_clients', true, true, false, 1),
('app_consulting_essential', 'core_settings', true, true, false, 2),
('app_consulting_essential', 'module_quotes', true, false, false, 3),
('app_consulting_essential', 'module_briefings', true, false, false, 4),
('app_consulting_essential', 'module_appointments', false, false, true, 5); -- Optional

-- 7. SEED RECOMMENDED ADD-ONS

-- Marketing Agency Starter add-ons
INSERT INTO public.saas_app_add_ons (app_id, add_on_type, tier_id, is_recommended, discount_percent, display_order) VALUES
('app_marketing_starter', 'branding', 'custom', true, 10, 1),
('app_marketing_starter', 'branding', 'whitelabel', false, 15, 2);

-- Cleaning Business Pro add-ons
INSERT INTO public.saas_app_add_ons (app_id, add_on_type, tier_id, is_recommended, discount_percent, display_order) VALUES
('app_cleaning_pro', 'branding', 'custom', true, 10, 1);

-- Consulting Firm Essential add-ons
INSERT INTO public.saas_app_add_ons (app_id, add_on_type, tier_id, is_recommended, discount_percent, display_order) VALUES
('app_consulting_essential', 'branding', 'custom', true, 10, 1),
('app_consulting_essential', 'branding', 'whitelabel', true, 15, 2);

-- 8. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_saas_apps_category ON public.saas_apps(category);
CREATE INDEX IF NOT EXISTS idx_saas_apps_active ON public.saas_apps(is_active);
CREATE INDEX IF NOT EXISTS idx_saas_apps_featured ON public.saas_apps(is_featured);
CREATE INDEX IF NOT EXISTS idx_saas_app_modules_app ON public.saas_app_modules(app_id);
CREATE INDEX IF NOT EXISTS idx_saas_app_add_ons_app ON public.saas_app_add_ons(app_id);
CREATE INDEX IF NOT EXISTS idx_organizations_active_app ON public.organizations(active_app_id);

-- 9. RLS POLICIES
ALTER TABLE public.saas_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_app_add_ons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS saas_apps_super_admin_all ON public.saas_apps;
DROP POLICY IF EXISTS saas_apps_view_active ON public.saas_apps;
DROP POLICY IF EXISTS saas_app_modules_super_admin_all ON public.saas_app_modules;
DROP POLICY IF EXISTS saas_app_modules_view ON public.saas_app_modules;
DROP POLICY IF EXISTS saas_app_add_ons_super_admin_all ON public.saas_app_add_ons;
DROP POLICY IF EXISTS saas_app_add_ons_view ON public.saas_app_add_ons;

-- Super admin full access to apps
CREATE POLICY saas_apps_super_admin_all ON public.saas_apps
FOR ALL TO authenticated
USING (auth.jwt() ->> 'platform_role' = 'super_admin')
WITH CHECK (auth.jwt() ->> 'platform_role' = 'super_admin');

-- Anyone authenticated can view active apps (for marketplace/selection)
CREATE POLICY saas_apps_view_active ON public.saas_apps
FOR SELECT TO authenticated
USING (is_active = true);

-- Super admin can manage app modules
CREATE POLICY saas_app_modules_super_admin_all ON public.saas_app_modules
FOR ALL TO authenticated
USING (auth.jwt() ->> 'platform_role' = 'super_admin')
WITH CHECK (auth.jwt() ->> 'platform_role' = 'super_admin');

-- Anyone can view app modules (for app details page)
CREATE POLICY saas_app_modules_view ON public.saas_app_modules
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.saas_apps
        WHERE saas_apps.id = saas_app_modules.app_id
        AND saas_apps.is_active = true
    )
);

-- Super admin can manage app add-ons
CREATE POLICY saas_app_add_ons_super_admin_all ON public.saas_app_add_ons
FOR ALL TO authenticated
USING (auth.jwt() ->> 'platform_role' = 'super_admin')
WITH CHECK (auth.jwt() ->> 'platform_role' = 'super_admin');

-- Anyone can view app add-ons
CREATE POLICY saas_app_add_ons_view ON public.saas_app_add_ons
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.saas_apps
        WHERE saas_apps.id = saas_app_add_ons.app_id
        AND saas_apps.is_active = true
    )
);

-- 10. HELPER FUNCTIONS

-- Function to assign app to organization
CREATE OR REPLACE FUNCTION public.assign_app_to_organization(
    p_organization_id UUID,
    p_app_id TEXT,
    p_enable_optional_modules BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_app RECORD;
    v_module RECORD;
    v_modules_to_enable TEXT[] := ARRAY[]::TEXT[];
    v_result JSONB;
BEGIN
    -- Get app details
    SELECT * INTO v_app
    FROM public.saas_apps
    WHERE id = p_app_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'App not found or inactive'
        );
    END IF;
    
    -- Update organization app assignment
    UPDATE public.organizations
    SET 
        active_app_id = p_app_id,
        app_activated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    -- Collect modules to enable
    FOR v_module IN 
        SELECT module_key, auto_enable, is_optional
        FROM public.saas_app_modules
        WHERE app_id = p_app_id
        ORDER BY sort_order
    LOOP
        -- Auto-enable if:
        -- 1. auto_enable is true
        -- 2. OR is optional but p_enable_optional_modules is true
        IF v_module.auto_enable OR (v_module.is_optional AND p_enable_optional_modules) THEN
            v_modules_to_enable := array_append(v_modules_to_enable, v_module.module_key);
        END IF;
    END LOOP;
    
    -- Update organization manual_module_overrides
    -- (This will be processed by the module system)
    UPDATE public.organizations
    SET 
        manual_module_overrides = v_modules_to_enable,
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'app_id', p_app_id,
        'app_name', v_app.name,
        'modules_enabled', v_modules_to_enable
    );
END;
$$;

COMMENT ON FUNCTION public.assign_app_to_organization IS 'Assigns an app template to an organization and enables its modules';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Apps System installed successfully';
    RAISE NOTICE 'Created 3 sample apps: Marketing Agency, Cleaning Business, Consulting Firm';
    RAISE NOTICE 'Use assign_app_to_organization() to assign apps to organizations';
END $$;
