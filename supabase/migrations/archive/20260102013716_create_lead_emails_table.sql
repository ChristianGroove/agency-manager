-- Migration: Create lead_emails table for CRM email integration
-- Date: 2026-01-02

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.lead_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    from_email TEXT,
    to_email TEXT,
    cc_emails TEXT[],
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    status TEXT DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_lead_emails_org ON public.lead_emails(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_lead ON public.lead_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_created ON public.lead_emails(created_at);

-- 3. RLS Policies
ALTER TABLE public.lead_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view emails of their org"
    ON public.lead_emails FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert emails to their org"
    ON public.lead_emails FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update emails of their org"
    ON public.lead_emails FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- 4. Comment
COMMENT ON TABLE public.lead_emails IS 'Stores email history for CRM leads';
