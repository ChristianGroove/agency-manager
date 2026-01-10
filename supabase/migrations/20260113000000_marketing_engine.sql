-- Marketing Engine Schema
-- Campaigns, Sequences, Steps, and Enrollments

-- 1. Campaigns (The Container)
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT, -- 'lead_nurture', 'onboarding', 'retention', 'promo'
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed', 'archived'
    tags TEXT[] DEFAULT '{}',
    
    -- Analytics Cache
    total_enrolled INT DEFAULT 0,
    total_completed INT DEFAULT 0,
    engagement_score NUMERIC DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Sequences (The Logic Flow)
CREATE TABLE IF NOT EXISTS marketing_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- 'manual', 'tag_added', 'deal_stage', 'form_submission'
    trigger_config JSONB DEFAULT '{}', -- { tag_id: '...', form_id: '...' }
    
    is_active BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Steps (The Nodes)
CREATE TABLE IF NOT EXISTS marketing_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES marketing_sequences(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL, -- 'email', 'whatsapp', 'delay', 'condition', 'action'
    name TEXT NOT NULL, -- 'Welcome Email', 'Wait 2 Days'
    
    -- Positioning for Visual Builder
    order_index INT NOT NULL DEFAULT 0,
    
    -- Configuration
    content JSONB DEFAULT '{}', -- { subject: '...', body: '...', template_id: '...' }
    delay_config JSONB DEFAULT '{}', -- { duration: 2, unit: 'days' }
    condition_config JSONB DEFAULT '{}', -- { field: 'email_opened', operator: 'is_true' }
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enrollments (The State)
CREATE TABLE IF NOT EXISTS marketing_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES marketing_sequences(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'failed', 'cancelled'
    current_step_id UUID REFERENCES marketing_steps(id),
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_error TEXT
);

-- Link Broadcasts to Campaigns (Optional back-link)
ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Standard Organization Isolation)
CREATE POLICY "View Campaigns" ON marketing_campaigns 
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Manage Campaigns" ON marketing_campaigns 
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "View Sequences" ON marketing_sequences 
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Manage Sequences" ON marketing_sequences 
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "View Steps" ON marketing_steps 
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Manage Steps" ON marketing_steps 
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "View Enrollments" ON marketing_enrollments 
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- Indexes for Performance
CREATE INDEX idx_campaigns_org ON marketing_campaigns(organization_id);
CREATE INDEX idx_sequences_campaign ON marketing_sequences(campaign_id);
CREATE INDEX idx_steps_sequence ON marketing_steps(sequence_id);
CREATE INDEX idx_enrollments_contact ON marketing_enrollments(contact_id);
CREATE INDEX idx_enrollments_status ON marketing_enrollments(status);
