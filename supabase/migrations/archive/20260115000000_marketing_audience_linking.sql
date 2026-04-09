-- Marketing Engine Enhancement Migration
-- Adds audience linking, opt-out support, and scheduling

-- 1. Link Audiences to Campaigns
ALTER TABLE marketing_campaigns
ADD COLUMN IF NOT EXISTS audience_id UUID REFERENCES marketing_audiences(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- 2. Opt-Out Support for Leads
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS marketing_opted_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;

-- 3. Index for efficient opt-out filtering
CREATE INDEX IF NOT EXISTS idx_leads_opted_out ON leads(marketing_opted_out) 
WHERE marketing_opted_out = true;

-- 4. Index for scheduled campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON marketing_campaigns(scheduled_for) 
WHERE scheduled_for IS NOT NULL AND status = 'active';

-- 5. Add campaign_id to enrollments for direct lookup
ALTER TABLE marketing_enrollments
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE;

-- 6. Index for campaign enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_campaign ON marketing_enrollments(campaign_id);

-- Comment for schema understanding
COMMENT ON COLUMN marketing_campaigns.audience_id IS 'Links campaign to a saved audience for bulk enrollment';
COMMENT ON COLUMN marketing_campaigns.scheduled_for IS 'When to start the campaign (null = immediate on activation)';
COMMENT ON COLUMN leads.marketing_opted_out IS 'If true, exclude from all marketing campaigns';
