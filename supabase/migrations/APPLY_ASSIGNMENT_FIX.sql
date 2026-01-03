-- FIXED: Consolidated Assignment System Schema & Functions
-- Run this in Supabase SQL Editor to fix 'agent_availability' errors

BEGIN;

-- 0. Cleanup (Force Reset of Assignment Tables & Functions)
DROP TRIGGER IF EXISTS trigger_update_agent_load ON public.conversations;
DROP FUNCTION IF EXISTS update_agent_load_on_assignment();
DROP FUNCTION IF EXISTS increment_agent_load(uuid);
DROP FUNCTION IF EXISTS decrement_agent_load(uuid);

DROP TABLE IF EXISTS agent_skills CASCADE;
DROP TABLE IF EXISTS assignment_history CASCADE;
DROP TABLE IF EXISTS assignment_rules CASCADE;
DROP TABLE IF EXISTS agent_availability CASCADE;

-- 1. Create Tables
CREATE TABLE agent_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  current_load INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 5,
  auto_assign_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, agent_id)
);

CREATE TABLE assignment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}'::jsonb,
  strategy VARCHAR(50) DEFAULT 'round-robin',
  assign_to TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assignment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignment_method VARCHAR(50),
  rule_id UUID REFERENCES assignment_rules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill VARCHAR(50) NOT NULL,
  proficiency INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, agent_id, skill)
);

-- 2. Enable RLS
ALTER TABLE agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Agent Availability
CREATE POLICY "Users can view availability in their org" ON agent_availability FOR SELECT USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own availability" ON agent_availability FOR UPDATE USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Admins can insert availability" ON agent_availability FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Assignment Rules
CREATE POLICY "Users can view rules in their org" ON assignment_rules FOR SELECT USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage rules" ON assignment_rules FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Assignment History
CREATE POLICY "Users can view history in their org" ON assignment_history FOR SELECT USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "System/Users can insert history" ON assignment_history FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Agent Skills
CREATE POLICY "Users can view skills in their org" ON agent_skills FOR SELECT USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage skills" ON agent_skills FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_agent_avail_org ON agent_availability(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_avail_status ON agent_availability(status);
CREATE INDEX IF NOT EXISTS idx_assign_rules_org ON assignment_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_assign_hist_conv ON assignment_history(conversation_id);

-- 5. Helper Functions & Triggers
CREATE OR REPLACE FUNCTION increment_agent_load(agent_id UUID) RETURNS void AS $$
BEGIN
    UPDATE public.agent_availability
    SET current_load = current_load + 1, updated_at = NOW()
    WHERE agent_availability.agent_id = increment_agent_load.agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_agent_load(agent_id UUID) RETURNS void AS $$
BEGIN
    UPDATE public.agent_availability
    SET current_load = GREATEST(0, current_load - 1), updated_at = NOW()
    WHERE agent_availability.agent_id = decrement_agent_load.agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_agent_load_on_assignment() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
        IF OLD.assigned_to IS NOT NULL THEN PERFORM decrement_agent_load(OLD.assigned_to); END IF;
        IF NEW.assigned_to IS NOT NULL THEN PERFORM increment_agent_load(NEW.assigned_to); END IF;
    END IF;
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
        PERFORM increment_agent_load(NEW.assigned_to);
    END IF;
    IF (TG_OP = 'UPDATE' AND NEW.status = 'archived' AND OLD.status != 'archived' AND NEW.assigned_to IS NOT NULL) THEN
        PERFORM decrement_agent_load(NEW.assigned_to);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_agent_load ON public.conversations;
CREATE TRIGGER trigger_update_agent_load
    AFTER INSERT OR UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_agent_load_on_assignment();

COMMIT;
