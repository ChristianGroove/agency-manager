-- Marketing Safety & Audiences Schema

-- 1. Audiences (Saved Lists / Segments)
CREATE TABLE IF NOT EXISTS marketing_audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    
    type TEXT NOT NULL DEFAULT 'dynamic', -- 'dynamic' (filters), 'static' (manual selection/csv)
    filter_config JSONB DEFAULT '{}', -- { status: 'won', tag_id: '...', score_min: 50 }
    
    cached_count INT DEFAULT 0,
    last_count_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Add Delivery/Safety Config to Campaigns
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS delivery_config JSONB DEFAULT '{
    "mode": "stealth", 
    "humanize": true, 
    "schedule_window": {"start": 9, "end": 18}, 
    "max_speed": "auto"
}';

-- 3. Link Campaigns to Audiences (Optional, if using saved audience)
ALTER TABLE marketing_campaigns
ADD COLUMN IF NOT EXISTS audience_id UUID REFERENCES marketing_audiences(id) ON DELETE SET NULL;

-- Enable RLS for Audiences
ALTER TABLE marketing_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Audiences" ON marketing_audiences 
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Manage Audiences" ON marketing_audiences 
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- Indexes
CREATE INDEX idx_audiences_org ON marketing_audiences(organization_id);
