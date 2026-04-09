-- ============================================
-- CRM Advanced Features Migration
-- Date: 2026-01-02
-- Description: Add tables for activities, tasks, notes, emails, and enhanced lead tracking
-- ============================================

-- ============================================
-- 1. ENHANCE LEADS TABLE
-- ============================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_factors JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(10,2);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source) WHERE source IS NOT NULL;

COMMENT ON COLUMN leads.notes IS 'Main notes/description for the lead';
COMMENT ON COLUMN leads.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN leads.source IS 'Lead source (website, referral, cold_call, etc)';
COMMENT ON COLUMN leads.assigned_to IS 'User assigned to this lead';
COMMENT ON COLUMN leads.score IS 'Lead score 0-100';
COMMENT ON COLUMN leads.estimated_value IS 'Estimated deal value';

-- ============================================
-- 2. LEAD ACTIVITIES (Timeline/History)
-- ============================================

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_org ON lead_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_user ON lead_activities(performed_by) WHERE performed_by IS NOT NULL;

COMMENT ON TABLE lead_activities IS 'Timeline of all lead activities and changes';
COMMENT ON COLUMN lead_activities.activity_type IS 'Type: status_change, assigned, note_added, email_sent, call_made, meeting_scheduled, converted, etc';

-- ============================================
-- 3. LEAD ASSIGNMENTS (History)
-- ============================================

CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead ON lead_assignments(lead_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_user ON lead_assignments(assigned_to);

COMMENT ON TABLE lead_assignments IS 'Assignment history for leads';

-- ============================================
-- 4. LEAD TASKS (Tasks & Follow-ups)
-- ============================================

CREATE TABLE IF NOT EXISTS lead_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) DEFAULT 'custom',
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned ON lead_tasks(assigned_to, due_date) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_tasks_org ON lead_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON lead_tasks(status, due_date);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_due ON lead_tasks(due_date) WHERE due_date IS NOT NULL AND status = 'pending';

COMMENT ON TABLE lead_tasks IS 'Tasks and follow-ups for leads';
COMMENT ON COLUMN lead_tasks.task_type IS 'Type: call, email, meeting, follow_up, custom';
COMMENT ON COLUMN lead_tasks.status IS 'Status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN lead_tasks.priority IS 'Priority: low, medium, high, urgent';

-- ============================================
-- 5. LEAD NOTES
-- ============================================

CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general',
  is_pinned BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_notes_org ON lead_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_pinned ON lead_notes(lead_id, is_pinned) WHERE is_pinned = TRUE;

COMMENT ON TABLE lead_notes IS 'Notes and comments on leads';
COMMENT ON COLUMN lead_notes.note_type IS 'Type: general, call, meeting, email';

-- ============================================
-- 6. LEAD EMAILS (Email Integration)
-- ============================================

CREATE TABLE IF NOT EXISTS lead_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  direction VARCHAR(10) NOT NULL,
  from_email VARCHAR(255),
  to_email VARCHAR(255),
  cc_emails TEXT[],
  subject VARCHAR(500),
  body_text TEXT,
  body_html TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_emails_lead ON lead_emails(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_emails_org ON lead_emails(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_status ON lead_emails(status);
CREATE INDEX IF NOT EXISTS idx_lead_emails_sent ON lead_emails(sent_at DESC) WHERE sent_at IS NOT NULL;

COMMENT ON TABLE lead_emails IS 'Email communication with leads';
COMMENT ON COLUMN lead_emails.direction IS 'Direction: inbound or outbound';
COMMENT ON COLUMN lead_emails.status IS 'Status: draft, sent, delivered, opened, clicked, bounced, failed';

-- ============================================
-- 7. LEAD DOCUMENTS/ATTACHMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS lead_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_documents_lead ON lead_documents(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_documents_org ON lead_documents(organization_id);

COMMENT ON TABLE lead_documents IS 'Documents and attachments for leads';

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- Lead Activities
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_activities_org_isolation ON lead_activities
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Lead Assignments
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_assignments_org_isolation ON lead_assignments
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Lead Tasks
ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_tasks_org_isolation ON lead_tasks
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Lead Notes
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_notes_org_isolation ON lead_notes
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Lead Emails
ALTER TABLE lead_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_emails_org_isolation ON lead_emails
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Lead Documents
ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_documents_org_isolation ON lead_documents
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to auto-create activity on lead update
CREATE OR REPLACE FUNCTION track_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO lead_activities (
      organization_id,
      lead_id,
      activity_type,
      description,
      metadata,
      performed_by
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'status_change',
      'Status changed from ' || COALESCE(OLD.status, 'none') || ' to ' || NEW.status,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS lead_status_change_trigger ON leads;
CREATE TRIGGER lead_status_change_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_lead_status_change();

-- Function to auto-create activity on lead assignment
CREATE OR REPLACE FUNCTION track_lead_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if assigned_to changed
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    -- Create assignment record
    INSERT INTO lead_assignments (
      organization_id,
      lead_id,
      assigned_to,
      assigned_by
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.assigned_to,
      auth.uid()
    );
    
    -- Create activity
    INSERT INTO lead_activities (
      organization_id,
      lead_id,
      activity_type,
      description,
      metadata,
      performed_by
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'assigned',
      CASE 
        WHEN NEW.assigned_to IS NULL THEN 'Lead unassigned'
        ELSE 'Lead assigned to user'
      END,
      jsonb_build_object(
        'assigned_to', NEW.assigned_to,
        'previous_assignee', OLD.assigned_to
      ),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS lead_assignment_trigger ON leads;
CREATE TRIGGER lead_assignment_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_lead_assignment();

-- Function to update task updated_at
CREATE OR REPLACE FUNCTION update_lead_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lead_task_update_trigger ON lead_tasks;
CREATE TRIGGER lead_task_update_trigger
  BEFORE UPDATE ON lead_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_task_timestamp();

-- ============================================
-- 10. SEED DATA (Activity Types Reference)
-- ============================================

COMMENT ON COLUMN lead_activities.activity_type IS E'Activity Types:\n- status_change: Lead stage changed\n- assigned: Lead assigned to user\n- unassigned: Lead unassigned\n- note_added: Note was added\n- email_sent: Email sent to lead\n- email_received: Email received from lead\n- call_made: Phone call made\n- call_received: Phone call received\n- meeting_scheduled: Meeting scheduled\n- meeting_completed: Meeting completed\n- task_created: Task created\n- task_completed: Task completed\n- document_uploaded: Document uploaded\n- converted: Lead converted to client\n- score_updated: Lead score changed\n- tag_added: Tag added\n- tag_removed: Tag removed';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ CRM Advanced Features migration completed successfully!';
  RAISE NOTICE '📊 Tables created: lead_activities, lead_assignments, lead_tasks, lead_notes, lead_emails, lead_documents';
  RAISE NOTICE '🔒 RLS policies applied';
  RAISE NOTICE '⚡ Triggers configured for auto-tracking';
END $$;
