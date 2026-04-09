-- ============================================
-- REVENUE SHARING SYSTEM
-- Date: 2026-01-13
-- Version: 1.0.0
-- 
-- Principios:
-- 1. Cliente pertenece a la plataforma, NO al reseller
-- 2. Sin comisiones vitalicias sobre suscripción base
-- 3. Comisiones decrecientes por fase
-- 4. Cálculo 100% server-side
-- 5. Liquidación manual con aprobación
-- ============================================

-- ============================================
-- PART 1: EXTEND ORGANIZATIONS TABLE
-- ============================================

-- Tracking de adquisición (quién trajo al cliente)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS acquired_by_reseller_id UUID REFERENCES public.organizations(id);

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS acquisition_date TIMESTAMP;

COMMENT ON COLUMN public.organizations.acquired_by_reseller_id IS 'Reseller que adquirió este cliente. Solo para tracking, el cliente SIEMPRE pertenece a Pixy.';
COMMENT ON COLUMN public.organizations.acquisition_date IS 'Fecha de adquisición. INMUTABLE - determina la antigüedad para cálculo de comisiones.';

-- ============================================
-- TRIGGER: BLOQUEAR CAMBIOS A acquisition_date
-- (Ajuste 1: Inmutabilidad)
-- ============================================
CREATE OR REPLACE FUNCTION public.protect_acquisition_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Si acquisition_date ya tenía valor y se intenta cambiar
    IF OLD.acquisition_date IS NOT NULL AND NEW.acquisition_date IS DISTINCT FROM OLD.acquisition_date THEN
        RAISE EXCEPTION 'acquisition_date es inmutable. No puede ser modificada después de ser establecida.';
    END IF;
    
    -- Si acquired_by_reseller_id ya tenía valor y se intenta cambiar
    IF OLD.acquired_by_reseller_id IS NOT NULL AND NEW.acquired_by_reseller_id IS DISTINCT FROM OLD.acquired_by_reseller_id THEN
        RAISE EXCEPTION 'acquired_by_reseller_id es inmutable. No puede ser modificado después de ser establecido.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_acquisition_date ON public.organizations;
CREATE TRIGGER trigger_protect_acquisition_date
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_acquisition_date();

-- ============================================
-- PART 2: REVENUE SHARE RULES
-- ============================================
CREATE TABLE IF NOT EXISTS public.revenue_share_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scope: NULL = regla global, UUID = regla específica para ese reseller
    reseller_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Definición de fase
    phase_name TEXT NOT NULL CHECK (phase_name IN ('activation', 'retention', 'stable')),
    phase_start_month INTEGER NOT NULL CHECK (phase_start_month >= 0),
    phase_end_month INTEGER CHECK (phase_end_month IS NULL OR phase_end_month >= phase_start_month),
    
    -- Configuración de comisión
    commission_percent DECIMAL(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
    
    -- Tipos de eventos elegibles
    -- (Ajuste 2: Tipos explícitos)
    eligible_event_types TEXT[] NOT NULL CHECK (
        eligible_event_types <@ ARRAY['subscription_base', 'subscription_addon', 'addon', 'overage', 'upsell', 'one_time']::TEXT[]
    ),
    
    -- Condición de actividad (Fase 2)
    requires_reseller_activity BOOLEAN DEFAULT FALSE,
    -- (Ajuste 3: Ventana configurable)
    activity_window_days INTEGER DEFAULT 30 CHECK (activity_window_days > 0),
    
    -- Vigencia del acuerdo
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE CHECK (effective_to IS NULL OR effective_to >= effective_from),
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rsr_reseller ON public.revenue_share_rules(reseller_org_id);
CREATE INDEX IF NOT EXISTS idx_rsr_phase ON public.revenue_share_rules(phase_start_month, phase_end_month);
CREATE INDEX IF NOT EXISTS idx_rsr_effective ON public.revenue_share_rules(effective_from, effective_to);

COMMENT ON TABLE public.revenue_share_rules IS 'Reglas de comisión por fase. NULL en reseller_org_id = regla global.';
COMMENT ON COLUMN public.revenue_share_rules.activity_window_days IS 'Ventana de días para verificar actividad del reseller (solo si requires_reseller_activity = true)';

-- ============================================
-- PART 3: BILLABLE EVENTS (Fuente de Verdad)
-- ============================================
CREATE TABLE IF NOT EXISTS public.billable_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación del cliente
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Cadena de adquisición (Ajuste 4: computada UNA vez, inmutable)
    -- Solo nivel 1 cobra en MVP
    reseller_chain JSONB NOT NULL DEFAULT '[]',
    
    -- Tipo de evento (Ajuste 2: tipos explícitos)
    event_type TEXT NOT NULL CHECK (event_type IN (
        'subscription_base',    -- Suscripción mensual/anual base
        'subscription_addon',   -- Add-on a la suscripción
        'addon',               -- Compra de add-on independiente
        'overage',             -- Excedente de uso
        'upsell',              -- Upgrade de plan
        'one_time'             -- Cargo único (setup, consultoría, etc.)
    )),
    
    -- Detalles del cargo
    description TEXT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    currency TEXT DEFAULT 'USD',
    
    -- Referencias externas
    invoice_id UUID,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    
    -- Antigüedad del cliente al momento del evento (para auditoría)
    client_age_months INTEGER NOT NULL DEFAULT 0,
    
    -- Estado de liquidación
    settled BOOLEAN DEFAULT FALSE,
    settlement_id UUID,
    
    -- Cálculo de comisión (se llena al liquidar)
    commission_calculated DECIMAL(10,2),
    commission_rule_id UUID REFERENCES public.revenue_share_rules(id),
    commission_phase TEXT,
    
    -- Timestamps
    event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices críticos
CREATE INDEX IF NOT EXISTS idx_be_org ON public.billable_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_be_settlement ON public.billable_events(settled, settlement_id);
CREATE INDEX IF NOT EXISTS idx_be_date ON public.billable_events(event_date);
CREATE INDEX IF NOT EXISTS idx_be_type ON public.billable_events(event_type);

COMMENT ON TABLE public.billable_events IS 'Registro inmutable de cada evento facturable. Fuente de verdad para liquidaciones.';
COMMENT ON COLUMN public.billable_events.reseller_chain IS 'Cadena de resellers capturada al crear. Formato: [{"org_id": "uuid", "level": 1}]. Solo nivel 1 cobra en MVP.';

-- ============================================
-- PART 4: STRIPE CONNECT ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    organization_id UUID UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Stripe Connect Express
    provider TEXT DEFAULT 'stripe_connect',
    stripe_account_id TEXT UNIQUE, -- acct_xxx
    
    -- Estado de onboarding
    onboarding_complete BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    
    -- Configuración de payout
    payout_schedule TEXT DEFAULT 'monthly' CHECK (payout_schedule IN ('weekly', 'monthly')),
    minimum_payout_amount DECIMAL(10,2) DEFAULT 50.00,
    
    -- Metadata
    country TEXT,
    default_currency TEXT DEFAULT 'USD',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.payment_accounts IS 'Cuentas de Stripe Connect para payouts a resellers.';

-- ============================================
-- PART 5: SETTLEMENTS (Liquidaciones)
-- ============================================
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reseller beneficiario
    reseller_org_id UUID NOT NULL REFERENCES public.organizations(id),
    
    -- Período de liquidación
    period_start DATE NOT NULL,
    period_end DATE NOT NULL CHECK (period_end >= period_start),
    
    -- Montos
    gross_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
    platform_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_payout DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Desglose por fase (transparencia)
    breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Conteo de eventos
    event_count INTEGER NOT NULL DEFAULT 0,
    
    -- Estado (Ajuste 5: aprobación manual requerida)
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Calculado, esperando aprobación
        'approved',     -- Aprobado por admin
        'processing',   -- Enviando a Stripe
        'completed',    -- Payout exitoso
        'failed',       -- Error en payout
        'cancelled'     -- Cancelado manualmente
    )),
    
    -- Stripe payout
    stripe_payout_id TEXT,
    stripe_transfer_id TEXT,
    
    -- Auditoría
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.profiles(id),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraint: un solo settlement por reseller por período
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_unique 
ON public.settlements(reseller_org_id, period_start, period_end);

COMMENT ON TABLE public.settlements IS 'Liquidaciones mensuales. Requieren aprobación manual antes de payout.';
COMMENT ON COLUMN public.settlements.breakdown IS 'Desglose: {"activation": {"events": 5, "gross": 1000, "commission": 250}, ...}';

-- ============================================
-- PART 6: RESELLER ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.reseller_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    reseller_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'addon_sale',
        'upsell',
        'support_session',
        'training',
        'consultation',
        'onboarding_assist'
    )),
    
    description TEXT,
    evidence_url TEXT, -- Link a screenshot, ticket, etc.
    metadata JSONB DEFAULT '{}',
    
    activity_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Índice para verificar actividad en período
CREATE INDEX IF NOT EXISTS idx_ral_reseller_client 
ON public.reseller_activity_log(reseller_org_id, client_org_id, activity_date);

COMMENT ON TABLE public.reseller_activity_log IS 'Registro de actividad del reseller con clientes. Requerido para comisiones en Fase 2.';

-- ============================================
-- PART 7: RLS POLICIES
-- ============================================

-- Revenue Share Rules
ALTER TABLE public.revenue_share_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY rsr_super_admin_all ON public.revenue_share_rules
FOR ALL TO authenticated
USING (auth.jwt() ->> 'platform_role' = 'super_admin')
WITH CHECK (auth.jwt() ->> 'platform_role' = 'super_admin');

CREATE POLICY rsr_reseller_view_own ON public.revenue_share_rules
FOR SELECT TO authenticated
USING (
    reseller_org_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR reseller_org_id IS NULL -- Reglas globales visibles para todos
);

-- Billable Events
ALTER TABLE public.billable_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY be_super_admin_all ON public.billable_events
FOR ALL TO authenticated
USING (auth.jwt() ->> 'platform_role' = 'super_admin')
WITH CHECK (auth.jwt() ->> 'platform_role' = 'super_admin');

-- Resellers pueden ver eventos de sus clientes adquiridos
CREATE POLICY be_reseller_view_acquired ON public.billable_events
FOR SELECT TO authenticated
USING (
    organization_id IN (
        SELECT id FROM public.organizations
        WHERE acquired_by_reseller_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
);

-- Payment Accounts
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY pa_super_admin_all ON public.payment_accounts
FOR ALL TO authenticated
USING (auth.jwt() ->> 'platform_role' = 'super_admin')
WITH CHECK (auth.jwt() ->> 'platform_role' = 'super_admin');

CREATE POLICY pa_org_admin_own ON public.payment_accounts
FOR ALL TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
)
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Settlements
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY set_super_admin_all ON public.settlements
FOR ALL TO authenticated
USING (auth.jwt() ->> 'platform_role' = 'super_admin')
WITH CHECK (auth.jwt() ->> 'platform_role' = 'super_admin');

CREATE POLICY set_reseller_view_own ON public.settlements
FOR SELECT TO authenticated
USING (
    reseller_org_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Reseller Activity Log
ALTER TABLE public.reseller_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ral_super_admin_all ON public.reseller_activity_log
FOR ALL TO authenticated
USING (auth.jwt() ->> 'platform_role' = 'super_admin')
WITH CHECK (auth.jwt() ->> 'platform_role' = 'super_admin');

CREATE POLICY ral_reseller_manage_own ON public.reseller_activity_log
FOR ALL TO authenticated
USING (
    reseller_org_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
)
WITH CHECK (
    reseller_org_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- ============================================
-- PART 8: DEFAULT REVENUE SHARE RULES
-- ============================================

-- Fase 1: Activación (Mes 0-6) - 25% incluyendo suscripción base
INSERT INTO public.revenue_share_rules 
(phase_name, phase_start_month, phase_end_month, commission_percent, eligible_event_types, requires_reseller_activity, activity_window_days, effective_from)
VALUES 
('activation', 0, 6, 25.00, 
 ARRAY['subscription_base', 'subscription_addon', 'addon', 'overage', 'upsell', 'one_time']::TEXT[], 
 FALSE, 30, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Fase 2: Retención (Mes 7-12) - 15% solo valor agregado CON actividad (60 días de ventana)
INSERT INTO public.revenue_share_rules 
(phase_name, phase_start_month, phase_end_month, commission_percent, eligible_event_types, requires_reseller_activity, activity_window_days, effective_from)
VALUES 
('retention', 7, 12, 15.00, 
 ARRAY['subscription_addon', 'addon', 'overage', 'upsell']::TEXT[], 
 TRUE, 60, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Fase 3: Estable (Mes 13+) - 10% solo valor agregado, SIN suscripción base
INSERT INTO public.revenue_share_rules 
(phase_name, phase_start_month, phase_end_month, commission_percent, eligible_event_types, requires_reseller_activity, activity_window_days, effective_from)
VALUES 
('stable', 13, NULL, 10.00, 
 ARRAY['subscription_addon', 'addon', 'overage', 'upsell', 'one_time']::TEXT[], 
 FALSE, 30, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 9: COMMISSION CALCULATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_event_commission(
    p_event_id UUID
) RETURNS TABLE (
    commission_amount DECIMAL(10,2),
    rule_id UUID,
    phase_name TEXT,
    client_age_months INTEGER,
    calculation_note TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event RECORD;
    v_client RECORD;
    v_age_months INTEGER;
    v_rule RECORD;
    v_has_activity BOOLEAN;
    v_reseller_id UUID;
BEGIN
    -- 1. Obtener evento
    SELECT * INTO v_event FROM public.billable_events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::DECIMAL(10,2), NULL::UUID, 'error'::TEXT, 0, 'Evento no encontrado';
        RETURN;
    END IF;
    
    -- 2. Obtener cliente y su reseller de adquisición
    SELECT 
        o.id,
        o.acquired_by_reseller_id,
        o.acquisition_date
    INTO v_client 
    FROM public.organizations o 
    WHERE o.id = v_event.organization_id;
    
    -- Si no tiene reseller, comisión = 0 (cliente directo)
    IF v_client.acquired_by_reseller_id IS NULL THEN
        RETURN QUERY SELECT 0::DECIMAL(10,2), NULL::UUID, 'direct_client'::TEXT, 0, 'Cliente directo - sin comisión';
        RETURN;
    END IF;
    
    v_reseller_id := v_client.acquired_by_reseller_id;
    
    -- 3. Calcular antigüedad del cliente en meses
    IF v_client.acquisition_date IS NULL THEN
        v_age_months := 0;
    ELSE
        v_age_months := GREATEST(0, 
            EXTRACT(YEAR FROM age(v_event.event_date, v_client.acquisition_date)) * 12 +
            EXTRACT(MONTH FROM age(v_event.event_date, v_client.acquisition_date))
        )::INTEGER;
    END IF;
    
    -- 4. Buscar regla aplicable
    SELECT * INTO v_rule
    FROM public.revenue_share_rules
    WHERE (reseller_org_id = v_reseller_id OR reseller_org_id IS NULL)
      AND v_age_months >= phase_start_month
      AND (phase_end_month IS NULL OR v_age_months <= phase_end_month)
      AND v_event.event_type = ANY(eligible_event_types)
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      AND effective_from <= CURRENT_DATE
    ORDER BY 
        reseller_org_id NULLS LAST, -- Prioriza regla específica del reseller
        phase_start_month DESC      -- Prioriza fase más específica
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::DECIMAL(10,2), NULL::UUID, 'no_eligible_rule'::TEXT, v_age_months, 
            format('Evento tipo %s no elegible en mes %s', v_event.event_type, v_age_months);
        RETURN;
    END IF;
    
    -- 5. Verificar actividad si es requerida (Fase 2)
    IF v_rule.requires_reseller_activity THEN
        SELECT EXISTS(
            SELECT 1 FROM public.reseller_activity_log
            WHERE reseller_org_id = v_reseller_id
              AND client_org_id = v_client.id
              AND activity_date >= (v_event.event_date - (v_rule.activity_window_days || ' days')::INTERVAL)
        ) INTO v_has_activity;
        
        IF NOT v_has_activity THEN
            RETURN QUERY SELECT 0::DECIMAL(10,2), v_rule.id, v_rule.phase_name || '_no_activity', v_age_months,
                format('Sin actividad en últimos %s días', v_rule.activity_window_days);
            RETURN;
        END IF;
    END IF;
    
    -- 6. Calcular y retornar comisión
    RETURN QUERY SELECT 
        ROUND(v_event.amount * (v_rule.commission_percent / 100), 2)::DECIMAL(10,2),
        v_rule.id,
        v_rule.phase_name,
        v_age_months,
        format('Comisión %s%% aplicada (Fase: %s, Mes: %s)', 
            v_rule.commission_percent, v_rule.phase_name, v_age_months);
END;
$$;

COMMENT ON FUNCTION public.calculate_event_commission IS 'Calcula la comisión de un evento basado en reglas de fase. Retorna 0 para clientes directos o eventos no elegibles.';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Revenue Sharing System installed successfully';
    RAISE NOTICE '   - Tables: revenue_share_rules, billable_events, payment_accounts, settlements, reseller_activity_log';
    RAISE NOTICE '   - Triggers: protect_acquisition_date (inmutabilidad)';
    RAISE NOTICE '   - Functions: calculate_event_commission';
    RAISE NOTICE '   - Default rules: activation(25%%), retention(15%%), stable(10%%)';
    RAISE NOTICE '   - RLS policies enabled';
END $$;
