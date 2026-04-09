-- ============================================
-- PAYMENT GATEWAY CONFIGURATION
-- ============================================
-- Platform-level payment settings for superadmin
-- Sensitive keys stored encrypted
-- ============================================

-- 1. Payment Gateway Config Table
CREATE TABLE IF NOT EXISTS public.payment_gateway_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Gateway identification
    gateway_name TEXT UNIQUE NOT NULL CHECK (
        gateway_name IN ('stripe', 'mercadopago', 'paypal', 'wompi')
    ),
    display_name TEXT NOT NULL,
    
    -- Status
    is_enabled BOOLEAN DEFAULT FALSE,
    is_live_mode BOOLEAN DEFAULT FALSE,
    
    -- Public keys (safe to store)
    public_key TEXT,
    
    -- Encrypted sensitive keys (stored in Vault or env vars reference)
    -- We store a reference, not the actual key
    secret_key_ref TEXT, -- e.g., "STRIPE_SECRET_KEY" (env var name)
    webhook_secret_ref TEXT,
    
    -- Configuration
    config JSONB DEFAULT '{}'::JSONB,
    -- Example: { "currency": "COP", "statement_descriptor": "PIXY", "capture_method": "automatic" }
    
    -- Platform fees
    platform_fee_percent DECIMAL(5,2) DEFAULT 0,
    platform_fee_fixed_cents INTEGER DEFAULT 0,
    
    -- Features
    supports_connect BOOLEAN DEFAULT FALSE,
    supports_subscriptions BOOLEAN DEFAULT FALSE,
    supports_invoicing BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_tested_at TIMESTAMP,
    test_result TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Insert default gateways
INSERT INTO public.payment_gateway_config (
    gateway_name, display_name, is_enabled, secret_key_ref, supports_connect, supports_subscriptions, supports_invoicing, config
) VALUES 
(
    'stripe', 
    'Stripe', 
    FALSE, 
    'STRIPE_SECRET_KEY',
    TRUE, TRUE, TRUE,
    '{"currency": "USD", "capture_method": "automatic"}'::JSONB
),
(
    'mercadopago', 
    'Mercado Pago', 
    FALSE,
    'MERCADOPAGO_ACCESS_TOKEN',
    FALSE, FALSE, TRUE,
    '{"currency": "COP"}'::JSONB
)
ON CONFLICT (gateway_name) DO NOTHING;

-- 3. RLS (superadmin only)
ALTER TABLE public.payment_gateway_config ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view/edit
CREATE POLICY "Platform admins can manage payment config" ON public.payment_gateway_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            JOIN public.organizations o ON o.id = om.organization_id
            WHERE om.user_id = auth.uid()
            AND o.organization_type = 'platform'
            AND om.role = 'owner'
        )
    );

-- 4. Function: Get active gateway
CREATE OR REPLACE FUNCTION public.get_active_payment_gateway()
RETURNS TABLE(
    gateway_name TEXT,
    display_name TEXT,
    public_key TEXT,
    config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pgc.gateway_name,
        pgc.display_name,
        pgc.public_key,
        pgc.config
    FROM public.payment_gateway_config pgc
    WHERE pgc.is_enabled = TRUE
    AND pgc.is_live_mode = (
        -- Check if we're in production
        CASE WHEN current_setting('app.environment', true) = 'production' 
        THEN TRUE ELSE FALSE END
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Audit log for changes
CREATE TABLE IF NOT EXISTS public.payment_config_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_name TEXT NOT NULL,
    action TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changes JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Trigger to log changes
CREATE OR REPLACE FUNCTION public.log_payment_config_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.payment_config_audit (
        gateway_name, action, changed_by, changes
    ) VALUES (
        COALESCE(NEW.gateway_name, OLD.gateway_name),
        TG_OP,
        auth.uid(),
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payment_config_audit ON public.payment_gateway_config;
CREATE TRIGGER trigger_payment_config_audit
    AFTER UPDATE ON public.payment_gateway_config
    FOR EACH ROW
    EXECUTE FUNCTION public.log_payment_config_change();

-- 7. Grants
GRANT SELECT ON public.payment_gateway_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_payment_gateway TO authenticated;

-- 8. Comments
COMMENT ON TABLE public.payment_gateway_config IS 'Platform payment gateway configuration (Stripe, MercadoPago, etc.)';
COMMENT ON COLUMN public.payment_gateway_config.secret_key_ref IS 'Reference to env var name, not actual key';
