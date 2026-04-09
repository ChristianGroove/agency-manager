-- ============================================
-- TENANT-LEVEL META ADS METRICS
-- Date: 2026-03-17
-- Description: Stores ad performance for the organization itself.
-- ============================================

CREATE TABLE IF NOT EXISTS public.meta_org_ads_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metrics
    spend NUMERIC(12,2) DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cpc NUMERIC(10,2) DEFAULT 0,
    ctr NUMERIC(10,4) DEFAULT 0,
    roas NUMERIC(10,2) DEFAULT 0,
    
    -- Structure (JSONB for campaigns/ads breakdown)
    campaigns JSONB DEFAULT '[]'::jsonb,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one snapshot per day per organization for clean time-series
    UNIQUE(organization_id, snapshot_date)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_meta_org_ads_metrics_org_date ON public.meta_org_ads_metrics(organization_id, snapshot_date);

-- RLS POLICIES
ALTER TABLE public.meta_org_ads_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their own ad metrics" ON public.meta_org_ads_metrics
FOR SELECT TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage their own ad metrics" ON public.meta_org_ads_metrics
FOR ALL TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_meta_org_ads_metrics_modtime
    BEFORE UPDATE ON public.meta_org_ads_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
