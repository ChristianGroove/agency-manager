-- CRM Task Management Schema
-- Allows creating tasks/follow-ups for leads

CREATE TABLE IF NOT EXISTS crm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Task Details
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'follow_up', -- 'follow_up', 'call', 'meeting', 'email', 'other'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    
    -- Status & Timing
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View Tasks" ON crm_tasks 
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Manage Tasks" ON crm_tasks 
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- Indexes
CREATE INDEX idx_tasks_lead ON crm_tasks(lead_id);
CREATE INDEX idx_tasks_assigned ON crm_tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON crm_tasks(due_date) WHERE status = 'pending';
CREATE INDEX idx_tasks_org_status ON crm_tasks(organization_id, status);

-- Add last_activity_at to leads for tracking
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger to update lead's last_activity when task is created/updated
CREATE OR REPLACE FUNCTION update_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads SET last_activity_at = NOW() WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_activity
AFTER INSERT OR UPDATE ON crm_tasks
FOR EACH ROW EXECUTE FUNCTION update_lead_activity();
