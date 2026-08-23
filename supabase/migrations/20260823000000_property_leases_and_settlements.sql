-- ==============================================================================
-- MIGRATION: 20260823000000_property_leases_and_settlements.sql
-- MODULE: RentFlow Pro (module_rentals) - Real Estate Space
-- PURPOSE: Property Leases & Monthly Settlement Management Engine
-- IDEMPOTENT: Safe to run multiple times without data loss or conflicts
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. TABLE: public.property_leases
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_leases (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.service_catalog(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
    co_signer_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    
    -- Financial Parameters
    monthly_rent NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (monthly_rent >= 0),
    admin_fee NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (admin_fee >= 0),
    admin_paid_by TEXT NOT NULL DEFAULT 'agency' CHECK (admin_paid_by IN ('agency', 'tenant')),
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 8.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    vat_on_commission BOOLEAN NOT NULL DEFAULT true,
    deposit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
    
    -- Term & Billing Schedule
    payment_day INTEGER NOT NULL DEFAULT 5 CHECK (payment_day BETWEEN 1 AND 31),
    payout_day INTEGER NOT NULL DEFAULT 10 CHECK (payout_day BETWEEN 1 AND 31),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Status & Guarantees
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'expired', 'defaulted', 'terminated')),
    guarantee_type TEXT NOT NULL DEFAULT 'direct' CHECK (guarantee_type IN ('direct', 'insurance', 'bond', 'deposit', 'promissory_note')),
    guarantee_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    bank_payout_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    
    -- Auditing & Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    
    CONSTRAINT property_leases_dates_check CHECK (start_date <= end_date)
);

COMMENT ON TABLE public.property_leases IS 'Active and historical rental lease contracts linking properties and CRM contacts with financial terms.';

-- ------------------------------------------------------------------------------
-- 2. TABLE: public.property_lease_settlements
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_lease_settlements (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lease_id UUID NOT NULL REFERENCES public.property_leases(id) ON DELETE CASCADE,
    period TEXT NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    
    -- Financial Breakdown
    rent_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (rent_amount >= 0),
    admin_fee_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (admin_fee_amount >= 0),
    gross_collected NUMERIC(15, 2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    deductions_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (deductions_amount >= 0),
    net_owner_payout NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    -- Lifecycle & Payout Status
    tenant_payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (tenant_payment_status IN ('pending', 'paid', 'partial', 'late')),
    tenant_paid_at TIMESTAMPTZ,
    owner_payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (owner_payout_status IN ('pending', 'paid', 'held')),
    owner_paid_at TIMESTAMPTZ,
    
    -- Itemized Deductions & Receipts
    deductions JSONB NOT NULL DEFAULT '[]'::jsonb,
    statement_pdf_url TEXT,
    payment_proof_url TEXT,
    receipt_number TEXT,
    notes TEXT,
    
    -- Auditing & Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    
    CONSTRAINT property_lease_settlements_unique_period UNIQUE (lease_id, period)
);

COMMENT ON TABLE public.property_lease_settlements IS 'Monthly billing, collection tracking, and owner payout statements for rental leases.';

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH-PERFORMANCE MULTI-TENANT QUERIES
-- ------------------------------------------------------------------------------
-- property_leases indexes
CREATE INDEX IF NOT EXISTS idx_property_leases_org ON public.property_leases USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_property_leases_org_status ON public.property_leases USING btree (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_property_leases_property ON public.property_leases USING btree (property_id);
CREATE INDEX IF NOT EXISTS idx_property_leases_tenant ON public.property_leases USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_leases_owner ON public.property_leases USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_property_leases_co_signer ON public.property_leases USING btree (co_signer_id);
CREATE INDEX IF NOT EXISTS idx_property_leases_dates ON public.property_leases USING btree (organization_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_property_leases_payment_day ON public.property_leases USING btree (organization_id, payment_day);

-- property_lease_settlements indexes
CREATE INDEX IF NOT EXISTS idx_lease_settlements_org ON public.property_lease_settlements USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_lease_settlements_lease ON public.property_lease_settlements USING btree (lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_settlements_period ON public.property_lease_settlements USING btree (organization_id, period);
CREATE INDEX IF NOT EXISTS idx_lease_settlements_tenant_status ON public.property_lease_settlements USING btree (organization_id, tenant_payment_status);
CREATE INDEX IF NOT EXISTS idx_lease_settlements_owner_status ON public.property_lease_settlements USING btree (organization_id, owner_payout_status);
CREATE INDEX IF NOT EXISTS idx_lease_settlements_org_period_status ON public.property_lease_settlements USING btree (organization_id, period, tenant_payment_status);
CREATE INDEX IF NOT EXISTS idx_lease_settlements_invoice ON public.property_lease_settlements USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_lease_settlements_deductions ON public.property_lease_settlements USING gin (deductions);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.property_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_lease_settlements ENABLE ROW LEVEL SECURITY;

-- 4.1 Policies on property_leases
DROP POLICY IF EXISTS "Tenant members view property leases" ON public.property_leases;
CREATE POLICY "Tenant members view property leases"
ON public.property_leases
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_members om 
        WHERE om.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Tenant members manage property leases" ON public.property_leases;
CREATE POLICY "Tenant members manage property leases"
ON public.property_leases
FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_members om 
        WHERE om.user_id = auth.uid()
    )
)
WITH CHECK (
    organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_members om 
        WHERE om.user_id = auth.uid()
    )
);

-- 4.2 Policies on property_lease_settlements
DROP POLICY IF EXISTS "Tenant members view property lease settlements" ON public.property_lease_settlements;
CREATE POLICY "Tenant members view property lease settlements"
ON public.property_lease_settlements
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_members om 
        WHERE om.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Tenant members manage property lease settlements" ON public.property_lease_settlements;
CREATE POLICY "Tenant members manage property lease settlements"
ON public.property_lease_settlements
FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_members om 
        WHERE om.user_id = auth.uid()
    )
)
WITH CHECK (
    organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_members om 
        WHERE om.user_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 5. UPDATED_AT TRIGGERS
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_property_leases_modtime ON public.property_leases;
CREATE TRIGGER update_property_leases_modtime
    BEFORE UPDATE ON public.property_leases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_lease_settlements_modtime ON public.property_lease_settlements;
CREATE TRIGGER update_property_lease_settlements_modtime
    BEFORE UPDATE ON public.property_lease_settlements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 6. SYSTEM MODULE & SAAS APP REGISTRATION
-- ------------------------------------------------------------------------------
INSERT INTO public.system_modules (key, name, category, is_core, description)
VALUES ('module_rentals', 'Gestión de Arriendos & Liquidaciones', 'Real Estate', false, 'Gestión de contratos de arrendamiento, control de cobranza y liquidaciones a propietarios con payouts e IVA.')
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

INSERT INTO public.saas_app_modules (
    app_id,
    module_key,
    auto_enable,
    is_core,
    is_optional,
    sort_order
) VALUES
    ('app_real_estate_pro', 'module_rentals', true, true, false, 8)
ON CONFLICT (app_id, module_key) DO NOTHING;

COMMIT;
