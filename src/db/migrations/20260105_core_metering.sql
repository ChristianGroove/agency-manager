-- CORE METERING SYSTEM
-- Created: 2026-01-05
-- Purpose: Unified ledger for system consumption (usage_events)

CREATE TABLE IF NOT EXISTS public.usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant Identification
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    parent_organization_id UUID REFERENCES public.organizations(id), -- For future reseller capability
    
    -- Consumption Classification
    engine TEXT NOT NULL CHECK (
        engine IN ('automation', 'messaging', 'ai', 'documents', 'storage')
    ),
    
    action TEXT NOT NULL, -- e.g., 'automation.execute', 'messaging.send'
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Context
    metadata JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Aggregation Performance
CREATE INDEX IF NOT EXISTS idx_usage_org_time ON public.usage_events (organization_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_usage_engine ON public.usage_events (engine);
CREATE INDEX IF NOT EXISTS idx_usage_parent ON public.usage_events (parent_organization_id);

-- RLS: Only Service Role can Insert/Update. Users might read their own if needed later.
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Allow system usage (Service Role) to bypass RLS implies no specific policy needed for Insert if using Admin Client,
-- BUT if we use client-side firing (though user said SDK internal), we might need policy.
-- User instructed "supabaseAdmin" in SDK, so standard RLS Deny All applies to public, which is good.

-- Optional: Allow org admins to view their usage
CREATE POLICY "Admins can view their organization usage" ON public.usage_events
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
