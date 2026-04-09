-- ============================================
-- PLAN LIMITS SYSTEM - PRODUCTION READY
-- ============================================
-- Implements usage limits per plan with auto-provisioning
-- ============================================

-- 1. Plan Templates Table (defines limits per plan)
CREATE TABLE IF NOT EXISTS public.plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code TEXT UNIQUE NOT NULL, -- 'starter', 'professional', 'business', 'scale'
    plan_name TEXT NOT NULL,
    price_monthly INTEGER NOT NULL, -- in cents
    price_yearly INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    features JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Plan Limit Definitions (what each plan includes)
CREATE TABLE IF NOT EXISTS public.plan_limit_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.plan_templates(id) ON DELETE CASCADE,
    engine TEXT NOT NULL, -- 'whatsapp', 'ai', 'crm', 'billing', 'storage', 'users'
    period TEXT NOT NULL, -- 'month', 'day', 'unlimited'
    limit_value INTEGER NOT NULL, -- -1 for unlimited
    description TEXT,
    UNIQUE(plan_id, engine, period)
);

-- 3. Ensure usage_limits table exists
CREATE TABLE IF NOT EXISTS public.usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    engine TEXT NOT NULL,
    period TEXT NOT NULL,
    limit_value INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, engine, period)
);

-- 4. Ensure usage_counters table exists
CREATE TABLE IF NOT EXISTS public.usage_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    engine TEXT NOT NULL,
    period TEXT NOT NULL,
    period_start DATE NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, engine, period, period_start)
);

-- ============================================
-- INSERT DEFAULT PLAN TEMPLATES
-- ============================================

INSERT INTO public.plan_templates (plan_code, plan_name, price_monthly, price_yearly, features) VALUES
('starter', 'Starter', 2900, 27840, '{"users": 3, "white_label": false, "api_access": false, "custom_domain": false}'),
('professional', 'Professional', 7900, 75840, '{"users": 10, "white_label": false, "api_access": true, "custom_domain": false}'),
('business', 'Business', 14900, 143040, '{"users": 25, "white_label": true, "api_access": true, "custom_domain": true}'),
('scale', 'Scale', 0, 0, '{"users": -1, "white_label": true, "api_access": true, "custom_domain": true}')
ON CONFLICT (plan_code) DO UPDATE SET
    plan_name = EXCLUDED.plan_name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    features = EXCLUDED.features,
    updated_at = NOW();

-- ============================================
-- INSERT LIMIT DEFINITIONS PER PLAN
-- ============================================

-- Starter Limits
INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'whatsapp', 'month', 1000, 'WhatsApp mensajes por mes' FROM public.plan_templates WHERE plan_code = 'starter'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'ai', 'month', 50000, 'AI tokens por mes' FROM public.plan_templates WHERE plan_code = 'starter'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'crm_contacts', 'unlimited', 500, 'Contactos CRM totales' FROM public.plan_templates WHERE plan_code = 'starter'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'users', 'unlimited', 3, 'Usuarios máximos' FROM public.plan_templates WHERE plan_code = 'starter'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'storage_gb', 'unlimited', 5, 'Almacenamiento GB' FROM public.plan_templates WHERE plan_code = 'starter'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'invoices', 'month', 20, 'Facturas por mes' FROM public.plan_templates WHERE plan_code = 'starter'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'automations', 'unlimited', 3, 'Automations activas' FROM public.plan_templates WHERE plan_code = 'starter'
ON CONFLICT DO NOTHING;

-- Professional Limits
INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'whatsapp', 'month', 5000, 'WhatsApp mensajes por mes' FROM public.plan_templates WHERE plan_code = 'professional'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'ai', 'month', 200000, 'AI tokens por mes' FROM public.plan_templates WHERE plan_code = 'professional'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'crm_contacts', 'unlimited', 2500, 'Contactos CRM totales' FROM public.plan_templates WHERE plan_code = 'professional'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'users', 'unlimited', 10, 'Usuarios máximos' FROM public.plan_templates WHERE plan_code = 'professional'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'storage_gb', 'unlimited', 25, 'Almacenamiento GB' FROM public.plan_templates WHERE plan_code = 'professional'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'invoices', 'month', 100, 'Facturas por mes' FROM public.plan_templates WHERE plan_code = 'professional'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'automations', 'unlimited', 15, 'Automations activas' FROM public.plan_templates WHERE plan_code = 'professional'
ON CONFLICT DO NOTHING;

-- Business Limits
INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'whatsapp', 'month', 15000, 'WhatsApp mensajes por mes' FROM public.plan_templates WHERE plan_code = 'business'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'ai', 'month', 1000000, 'AI tokens por mes' FROM public.plan_templates WHERE plan_code = 'business'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'crm_contacts', 'unlimited', 10000, 'Contactos CRM totales' FROM public.plan_templates WHERE plan_code = 'business'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'users', 'unlimited', 25, 'Usuarios máximos' FROM public.plan_templates WHERE plan_code = 'business'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'storage_gb', 'unlimited', 100, 'Almacenamiento GB' FROM public.plan_templates WHERE plan_code = 'business'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'invoices', 'month', -1, 'Facturas ilimitadas' FROM public.plan_templates WHERE plan_code = 'business'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'automations', 'unlimited', 50, 'Automations activas' FROM public.plan_templates WHERE plan_code = 'business'
ON CONFLICT DO NOTHING;

-- Scale (all unlimited)
INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'whatsapp', 'month', -1, 'Ilimitado' FROM public.plan_templates WHERE plan_code = 'scale'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'ai', 'month', -1, 'Ilimitado' FROM public.plan_templates WHERE plan_code = 'scale'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'crm_contacts', 'unlimited', -1, 'Ilimitado' FROM public.plan_templates WHERE plan_code = 'scale'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limit_definitions (plan_id, engine, period, limit_value, description)
SELECT id, 'users', 'unlimited', -1, 'Ilimitado' FROM public.plan_templates WHERE plan_code = 'scale'
ON CONFLICT DO NOTHING;

-- ============================================
-- FUNCTION: Provision Limits for New Org
-- ============================================

CREATE OR REPLACE FUNCTION public.provision_org_limits(
    p_organization_id UUID,
    p_plan_code TEXT DEFAULT 'starter'
)
RETURNS VOID AS $$
DECLARE
    v_plan_id UUID;
BEGIN
    -- Get plan ID
    SELECT id INTO v_plan_id 
    FROM public.plan_templates 
    WHERE plan_code = p_plan_code AND is_active = TRUE;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Plan % not found', p_plan_code;
    END IF;
    
    -- Insert limits from plan definitions
    INSERT INTO public.usage_limits (organization_id, engine, period, limit_value)
    SELECT 
        p_organization_id,
        pld.engine,
        pld.period,
        pld.limit_value
    FROM public.plan_limit_definitions pld
    WHERE pld.plan_id = v_plan_id
    ON CONFLICT (organization_id, engine, period) DO UPDATE
    SET limit_value = EXCLUDED.limit_value, updated_at = NOW();
    
    -- Update org with plan reference
    UPDATE public.organizations
    SET 
        subscription_status = 'active',
        updated_at = NOW()
    WHERE id = p_organization_id;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-provision on Org Creation
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_provision_org_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Provision starter limits by default
    PERFORM public.provision_org_limits(NEW.id, 'starter');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_provision_limits ON public.organizations;
CREATE TRIGGER trigger_auto_provision_limits
    AFTER INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_provision_org_limits();

-- ============================================
-- FUNCTION: Upgrade Plan
-- ============================================

CREATE OR REPLACE FUNCTION public.upgrade_org_plan(
    p_organization_id UUID,
    p_new_plan_code TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Re-provision with new plan limits
    PERFORM public.provision_org_limits(p_organization_id, p_new_plan_code);
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limit_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- Plan templates are public read
CREATE POLICY "Anyone can view active plans" ON public.plan_templates
    FOR SELECT USING (is_active = TRUE);

-- Limit definitions are public read
CREATE POLICY "Anyone can view limit definitions" ON public.plan_limit_definitions
    FOR SELECT USING (TRUE);

-- Usage limits: org members can view
DROP POLICY IF EXISTS "Org members can view usage limits" ON public.usage_limits;
CREATE POLICY "Org members can view usage limits" ON public.usage_limits
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- Usage counters: org members can view
DROP POLICY IF EXISTS "Org members can view usage counters" ON public.usage_counters;
CREATE POLICY "Org members can view usage counters" ON public.usage_counters
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_usage_limits_org ON public.usage_limits(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_org ON public.usage_counters(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_period ON public.usage_counters(organization_id, engine, period_start);

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON public.plan_templates TO authenticated;
GRANT SELECT ON public.plan_limit_definitions TO authenticated;
GRANT SELECT ON public.usage_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.usage_counters TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_org_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.upgrade_org_plan TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.plan_templates IS 'Defines available subscription plans (Starter, Professional, Business, Scale)';
COMMENT ON TABLE public.plan_limit_definitions IS 'Defines limits per plan template per engine';
COMMENT ON TABLE public.usage_limits IS 'Applied limits per organization (provisioned from plan)';
COMMENT ON TABLE public.usage_counters IS 'Tracks actual usage per organization per period';
COMMENT ON FUNCTION public.provision_org_limits IS 'Provisions usage limits for an org based on plan code';
COMMENT ON FUNCTION public.upgrade_org_plan IS 'Upgrades an organization to a new plan';
