-- ============================================
-- FASE 1: SISTEMA DE BRANDING TIERED
-- Date: 2025-01-01
-- ============================================

-- 1. BRANDING TIERS CATALOG
CREATE TABLE IF NOT EXISTS public.branding_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    restrictions JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.branding_tiers IS 'Catalog of branding tiers available for organizations';
COMMENT ON COLUMN public.branding_tiers.features IS 'JSON object with enabled features for this tier';
COMMENT ON COLUMN public.branding_tiers.restrictions IS 'JSON object with restrictions/limits for this tier';

-- 2. ORGANIZATION ADD-ONS (for tracking subscriptions to add-ons like branding)
CREATE TABLE IF NOT EXISTS public.organization_add_ons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    add_on_type TEXT NOT NULL, -- 'branding', 'domain', 'analytics', etc.
    tier_id TEXT, -- Reference to specific tier if applicable
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'suspended'
    activated_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP,
    next_billing_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, add_on_type)
);

COMMENT ON TABLE public.organization_add_ons IS 'Tracks active add-on subscriptions for organizations';
COMMENT ON COLUMN public.organization_add_ons.add_on_type IS 'Type of add-on: branding, domain, analytics';
COMMENT ON COLUMN public.organization_add_ons.tier_id IS 'Specific tier subscribed to (e.g., custom, whitelabel)';

-- 3. SEED BRANDING TIERS (BEFORE adding FK column to organizations!)
INSERT INTO public.branding_tiers (id, name, display_name, price_monthly, description, features, restrictions, sort_order) VALUES
(
    'basic',
    'basic',
    'Basic Branding',
    0,
    'Free basic branding with Pixy platform defaults. Perfect for getting started.',
    '{
        "custom_logo": false,
        "custom_colors": false,
        "custom_fonts": false,
        "white_label_emails": false,
        "remove_pixy_branding": false,
        "custom_domain": false,
        "custom_favicon": false,
        "email_templates": "standard",
        "portal_footer_text": "Powered by Pixy"
    }'::jsonb,
    '{
        "max_logo_size_mb": 0,
        "color_customization": false,
        "font_selection": false
    }'::jsonb,
    1
),
(
    'custom',
    'custom',
    'Custom Branding',
    29,
    'Personalize your platform with your own logo, colors, and fonts. Remove Pixy branding from client-facing areas.',
    '{
        "custom_logo": true,
        "custom_colors": true,
        "custom_fonts": true,
        "white_label_emails": true,
        "remove_pixy_branding": true,
        "custom_domain": false,
        "custom_favicon": true,
        "email_templates": "custom",
        "portal_footer_text": "custom",
        "google_fonts": true,
        "color_picker": true
    }'::jsonb,
    '{
        "max_logo_size_mb": 5,
        "color_customization": true,
        "font_selection": "google_fonts",
        "max_custom_colors": 5
    }'::jsonb,
    2
),
(
    'whitelabel',
    'whitelabel',
    'White Label',
    99,
    'Complete white-label solution. Your brand, your domain, zero Pixy references. Perfect for agencies reselling the platform.',
    '{
        "custom_logo": true,
        "custom_colors": true,
        "custom_fonts": true,
        "white_label_emails": true,
        "remove_pixy_branding": true,
        "custom_domain": true,
        "custom_favicon": true,
        "email_templates": "fully_custom",
        "portal_footer_text": "custom",
        "google_fonts": true,
        "custom_css": true,
        "api_branding": true,
        "custom_login_page": true,
        "remove_all_references": true
    }'::jsonb,
    '{
        "max_logo_size_mb": 10,
        "color_customization": true,
        "font_selection": "all",
        "max_custom_colors": 999,
        "custom_css_allowed": true
    }'::jsonb,
    3
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    price_monthly = EXCLUDED.price_monthly,
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    restrictions = EXCLUDED.restrictions,
    updated_at = NOW();

-- 4. EXTEND ORGANIZATIONS TABLE (AFTER tiers exist!)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS branding_tier_id TEXT REFERENCES public.branding_tiers(id) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS branding_tier_activated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS branding_custom_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.branding_tier_id IS 'Current active branding tier';
COMMENT ON COLUMN public.organizations.branding_custom_config IS 'Custom branding configuration (logo URLs, colors, etc.)';

-- 5. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_org_add_ons_organization ON public.organization_add_ons(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_add_ons_status ON public.organization_add_ons(status);
CREATE INDEX IF NOT EXISTS idx_org_add_ons_type ON public.organization_add_ons(add_on_type);
CREATE INDEX IF NOT EXISTS idx_organizations_branding_tier ON public.organizations(branding_tier_id);

-- 6. RLS POLICIES
ALTER TABLE public.branding_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_add_ons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS branding_tiers_super_admin_all ON public.branding_tiers;
DROP POLICY IF EXISTS branding_tiers_view_active ON public.branding_tiers;
DROP POLICY IF EXISTS org_add_ons_view_own ON public.organization_add_ons;
DROP POLICY IF EXISTS org_add_ons_super_admin_all ON public.organization_add_ons;

-- Super admin can manage all branding tiers
CREATE POLICY branding_tiers_super_admin_all ON public.branding_tiers 
FOR ALL TO authenticated
USING (auth.jwt() ->> 'platform_role' = 'super_admin')
WITH CHECK (auth.jwt() ->> 'platform_role' = 'super_admin');

-- Anyone authenticated can view active tiers (for upgrade UI)
CREATE POLICY branding_tiers_view_active ON public.branding_tiers 
FOR SELECT TO authenticated
USING (is_active = true);

-- Users can view add-ons for their organizations
CREATE POLICY org_add_ons_view_own ON public.organization_add_ons 
FOR SELECT TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Super admin can manage all add-ons
CREATE POLICY org_add_ons_super_admin_all ON public.organization_add_ons 
FOR ALL TO authenticated
USING (auth.jwt() ->> 'platform_role' = 'super_admin')
WITH CHECK (auth.jwt() ->> 'platform_role' = 'super_admin');

-- 7. FUNCTIONS

-- Function to upgrade branding tier
CREATE OR REPLACE FUNCTION public.upgrade_branding_tier(
    p_organization_id UUID,
    p_new_tier_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tier_price DECIMAL(10,2);
    v_result JSONB;
BEGIN
    -- Get tier price
    SELECT price_monthly INTO v_tier_price
    FROM public.branding_tiers
    WHERE id = p_new_tier_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid tier ID'
        );
    END IF;
    
    -- Update organization
    UPDATE public.organizations
    SET 
        branding_tier_id = p_new_tier_id,
        branding_tier_activated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    -- Upsert add-on subscription
    INSERT INTO public.organization_add_ons (
        organization_id,
        add_on_type,
        tier_id,
        price_monthly,
        status,
        next_billing_date
    ) VALUES (
        p_organization_id,
        'branding',
        p_new_tier_id,
        v_tier_price,
        'active',
        CURRENT_DATE + INTERVAL '1 month'
    )
    ON CONFLICT (organization_id, add_on_type) 
    DO UPDATE SET
        tier_id = EXCLUDED.tier_id,
        price_monthly = EXCLUDED.price_monthly,
        status = 'active',
        activated_at = NOW(),
        next_billing_date = CURRENT_DATE + INTERVAL '1 month',
        updated_at = NOW();
    
    RETURN jsonb_build_object(
        'success', true,
        'tier', p_new_tier_id,
        'price', v_tier_price
    );
END;
$$;

COMMENT ON FUNCTION public.upgrade_branding_tier IS 'Upgrades organization branding tier and creates/updates add-on subscription';

-- 8. UPDATE EXISTING ORGANIZATIONS TO BASIC TIER
UPDATE public.organizations
SET branding_tier_id = 'basic'
WHERE branding_tier_id IS NULL;

-- 9. VALIDATION CONSTRAINTS
ALTER TABLE public.organization_add_ons
ADD CONSTRAINT check_add_on_status CHECK (status IN ('active', 'cancelled', 'expired', 'suspended'));

ALTER TABLE public.organization_add_ons
ADD CONSTRAINT check_price_non_negative CHECK (price_monthly >= 0);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Branding Tiers system installed successfully';
    RAISE NOTICE 'Created 3 tiers: basic (free), custom ($29), whitelabel ($99)';
END $$;
