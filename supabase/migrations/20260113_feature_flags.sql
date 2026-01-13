-- Feature Flags: Granular control within modules
-- Allows enabling/disabling specific features per organization

CREATE TABLE IF NOT EXISTS feature_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_key text NOT NULL,
    feature_key text NOT NULL,
    enabled boolean DEFAULT true,
    config jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(organization_id, module_key, feature_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_org 
ON feature_flags(organization_id);

CREATE INDEX IF NOT EXISTS idx_feature_flags_module 
ON feature_flags(organization_id, module_key);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their org's feature flags
CREATE POLICY "feature_flags_read_own_org" ON feature_flags
FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- RLS Policy: Only admins can modify flags
CREATE POLICY "feature_flags_admin_write" ON feature_flags
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE user_id = auth.uid() 
        AND organization_id = feature_flags.organization_id 
        AND role IN ('owner', 'admin')
    )
);

-- Seed common feature flags definition (reference only, actual flags are per-org)
COMMENT ON TABLE feature_flags IS 'Per-organization feature toggles within modules. Common features:
- crm.lead_scoring: Automatic lead scoring
- crm.ai_suggestions: AI-powered suggestions in inbox
- crm.auto_assignment: Auto-assign leads to agents
- invoicing.auto_reminders: Automatic payment reminders
- invoicing.recurring: Recurring invoices
- marketing.ab_testing: A/B testing in campaigns
- ai.agent_qa: Agent QA analysis
- ai.sentiment: Sentiment analysis';
