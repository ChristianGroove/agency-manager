-- Meta Integration Schema
-- Decoupled tables for managing Meta tokens and caching insights

-- 1. Integration Configs (Stores Access Tokens)
CREATE TABLE IF NOT EXISTS integration_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('meta')),
    access_token TEXT NOT NULL, -- In production, this should be encrypted
    ad_account_id TEXT,
    page_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_client_platform UNIQUE (client_id, platform)
);

-- 2. Meta Ads Cache (Refresh: ~15 mins)
CREATE TABLE IF NOT EXISTS meta_ads_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    spend NUMERIC(10, 2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr NUMERIC(5, 2) DEFAULT 0,
    cpc NUMERIC(5, 2) DEFAULT 0,
    roas NUMERIC(5, 2) DEFAULT 0,
    campaigns JSONB DEFAULT '[]'::JSONB, -- Top 5 active campaigns
    snapshot_date DATE DEFAULT CURRENT_DATE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_ads_daily_snapshot UNIQUE (client_id, snapshot_date)
);

-- 3. Meta Social Cache (Refresh: ~60 mins)
CREATE TABLE IF NOT EXISTS meta_social_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    followers INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    top_posts JSONB DEFAULT '[]'::JSONB, -- Top 3 recent posts
    snapshot_date DATE DEFAULT CURRENT_DATE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_social_daily_snapshot UNIQUE (client_id, snapshot_date)
);

-- 4. RLS Policies
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_social_metrics ENABLE ROW LEVEL SECURITY;

-- Admins: Full Access
CREATE POLICY "Admins can manage integrations" ON integration_configs
    USING (false); -- Restricted to Service Role for now, until Admin Role is defined

-- Clients: View Own Metrics
CREATE POLICY "Clients can view own ads metrics" ON meta_ads_metrics
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM clients WHERE id = meta_ads_metrics.client_id));

CREATE POLICY "Clients can view own social metrics" ON meta_social_metrics
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM clients WHERE id = meta_social_metrics.client_id));

-- Indexes for Performance
CREATE INDEX idx_meta_ads_client_date ON meta_ads_metrics(client_id, snapshot_date);
CREATE INDEX idx_meta_social_client_date ON meta_social_metrics(client_id, snapshot_date);
