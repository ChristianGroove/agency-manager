-- Portal Multivertical Configuration Migration
-- Date: 2026-01-15
-- Purpose: Create configurable portal modules per app/vertical

-- ============================================
-- 1. CREATE PORTAL CONFIG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS saas_apps_portal_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id text REFERENCES saas_apps(id) ON DELETE CASCADE,
    module_slug text NOT NULL,
    is_enabled boolean DEFAULT true,
    display_order integer DEFAULT 0,
    portal_tab_label text NOT NULL,
    portal_icon_key text DEFAULT 'LayoutDashboard',
    portal_component_key text NOT NULL,
    target_portal text DEFAULT 'client', -- 'client' or 'staff'
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(app_id, module_slug)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_portal_config_app 
    ON saas_apps_portal_config(app_id, is_enabled, display_order);

-- ============================================
-- 2. RLS POLICIES
-- ============================================

ALTER TABLE saas_apps_portal_config ENABLE ROW LEVEL SECURITY;

-- Public read (portal needs to read this without auth)
CREATE POLICY "Public can read portal config" ON saas_apps_portal_config
    FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage portal config" ON saas_apps_portal_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND platform_role = 'super_admin'
        )
    );

-- ============================================
-- 3. SEED DATA FOR AGENCY-MANAGER APP
-- ============================================

-- Get the agency-manager app ID
DO $$
DECLARE
    agency_app_id uuid;
BEGIN
    SELECT id INTO agency_app_id FROM saas_apps WHERE slug = 'agency-manager';
    
    IF agency_app_id IS NOT NULL THEN
        -- Insert portal modules for client portal
        INSERT INTO saas_apps_portal_config 
            (app_id, module_slug, display_order, portal_tab_label, portal_icon_key, portal_component_key, target_portal)
        VALUES
            (agency_app_id, 'summary', 0, 'Resumen', 'LayoutDashboard', 'summary', 'client'),
            (agency_app_id, 'services', 1, 'Servicios', 'Layers', 'services', 'client'),
            (agency_app_id, 'billing', 2, 'Pagos', 'CreditCard', 'billing', 'client'),
            (agency_app_id, 'insights', 3, 'Insights', 'BarChart3', 'insights', 'client'),
            (agency_app_id, 'hosting', 4, 'Hosting', 'Server', 'hosting', 'client')
        ON CONFLICT (app_id, module_slug) DO UPDATE SET
            display_order = EXCLUDED.display_order,
            portal_tab_label = EXCLUDED.portal_tab_label,
            portal_icon_key = EXCLUDED.portal_icon_key,
            portal_component_key = EXCLUDED.portal_component_key;
    END IF;
END $$;

-- ============================================
-- 4. SEED DATA FOR CLEANING-OPS APP (If exists)
-- ============================================

DO $$
DECLARE
    cleaning_app_id uuid;
BEGIN
    SELECT id INTO cleaning_app_id FROM saas_apps WHERE slug = 'cleaning-ops';
    
    IF cleaning_app_id IS NOT NULL THEN
        INSERT INTO saas_apps_portal_config 
            (app_id, module_slug, display_order, portal_tab_label, portal_icon_key, portal_component_key, target_portal)
        VALUES
            (cleaning_app_id, 'summary', 0, 'Resumen', 'LayoutDashboard', 'summary', 'client'),
            (cleaning_app_id, 'billing', 1, 'Pagos', 'CreditCard', 'billing', 'client'),
            -- Staff portal modules
            (cleaning_app_id, 'jobs', 0, 'Trabajos', 'Briefcase', 'jobs', 'staff'),
            (cleaning_app_id, 'schedule', 1, 'Horario', 'Calendar', 'schedule', 'staff')
        ON CONFLICT (app_id, module_slug) DO UPDATE SET
            display_order = EXCLUDED.display_order,
            portal_tab_label = EXCLUDED.portal_tab_label;
    END IF;
END $$;

-- ============================================
-- 5. HELPER VIEW FOR EASY QUERYING
-- ============================================

CREATE OR REPLACE VIEW portal_modules_by_app AS
SELECT 
    a.slug as app_slug,
    a.name as app_name,
    pc.module_slug,
    pc.portal_tab_label,
    pc.portal_icon_key,
    pc.portal_component_key,
    pc.target_portal,
    pc.display_order,
    pc.is_enabled
FROM saas_apps_portal_config pc
JOIN saas_apps a ON a.id = pc.app_id
WHERE pc.is_enabled = true
ORDER BY a.slug, pc.target_portal, pc.display_order;
