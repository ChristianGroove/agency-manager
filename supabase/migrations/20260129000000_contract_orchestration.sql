-- ============================================
-- FASE 37: CONTRACT ORCHESTRATION & CRM TRACKING
-- Date: 2026-01-29
-- Description: Create contracts table, RLS and email template for async flow
-- ============================================

-- 1. Create Contracts Table
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    number VARCHAR(50) UNIQUE,
    title TEXT,
    content JSONB NOT NULL, -- The structured JSON (header, clauses, footer)
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'void', 'expired')),
    pdf_url TEXT,
    vault_id UUID, -- Reference to vault entry if saved
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Add Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_org ON public.contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

-- 3. Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY contracts_org_isolation ON public.contracts
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- 5. Helper Function for Content Updates
CREATE OR REPLACE FUNCTION update_contract_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_timestamp();

-- 6. Seed Default Email Template for Contracts
-- Only if not exists to avoid duplicates
INSERT INTO public.email_templates (slug, subject, body_html)
VALUES (
    'contract_delivery',
    'Tu Contrato de Servicios - {{agency_name}}',
    '<html><body><h1>Hola {{client_name}}</h1><p>Adjunto encontrarás el contrato de servicios generado por <b>{{agency_name}}</b>.</p><p>Por favor revísalo y no dudes en contactarnos si tienes dudas.</p><br/><p>Saludos,</p><p>El equipo de {{agency_name}}</p></body></html>'
)
ON CONFLICT DO NOTHING;

-- If unique constraint is only on slug and org (checking email_service logic)
-- Assuming email_templates has UNIQUE(slug, organization_id) or similar.
-- If not, simple insert is fine for global.

COMMENT ON TABLE public.contracts IS 'Stores generated contracts and their lifecycle statuses';
