-- =============================================
-- BROADCASTS TABLE FOR MASS CAMPAIGNS
-- =============================================

-- Create broadcasts table
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
    filters JSONB DEFAULT '{}',
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_broadcasts_organization ON broadcasts(organization_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);

-- Enable RLS
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "broadcasts_select_own_org" ON broadcasts
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "broadcasts_insert_own_org" ON broadcasts
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "broadcasts_update_own_org" ON broadcasts
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "broadcasts_delete_own_org" ON broadcasts
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Update trigger
CREATE TRIGGER broadcasts_updated_at
    BEFORE UPDATE ON broadcasts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- BROADCAST RECIPIENTS TABLE (for tracking individual sends)
-- =============================================

CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_lead ON broadcast_recipients(lead_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status ON broadcast_recipients(status);

-- Enable RLS
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policy (inherits from broadcasts)
CREATE POLICY "broadcast_recipients_select_via_broadcast" ON broadcast_recipients
    FOR SELECT USING (
        broadcast_id IN (
            SELECT id FROM broadcasts WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "broadcast_recipients_insert_via_broadcast" ON broadcast_recipients
    FOR INSERT WITH CHECK (
        broadcast_id IN (
            SELECT id FROM broadcasts WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

COMMENT ON TABLE broadcasts IS 'Stores broadcast campaigns for mass messaging';
COMMENT ON TABLE broadcast_recipients IS 'Tracks individual recipient status for broadcasts';
