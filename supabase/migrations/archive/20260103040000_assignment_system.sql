-- Migration: Create Assignment System
-- Description: Adds tables for agent availability, assignment rules, history, and skills
-- Author: Antigravity
-- Date: 2026-01-03

-- 1. Agent Availability Table
CREATE TABLE IF NOT EXISTS agent_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'offline', -- 'online', 'offline', 'busy', 'away'
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Workload Management
  current_load INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 5,
  auto_assign_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, agent_id)
);

-- 2. Assignment Rules Table
CREATE TABLE IF NOT EXISTS assignment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  is_active BOOLEAN DEFAULT true,
  
  -- Logic
  conditions JSONB DEFAULT '{}'::jsonb, -- { channel: ['whatsapp'], tags: ['vip'], ... }
  strategy VARCHAR(50) DEFAULT 'round-robin', -- 'round-robin', 'load-balance', 'skills-based', 'specific-agent'
  assign_to TEXT[], -- Array of Agent IDs or specific target
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Assignment History Table
CREATE TABLE IF NOT EXISTS assignment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  assignment_method VARCHAR(50), -- 'auto-rule', 'manual', 'fallback'
  rule_id UUID REFERENCES assignment_rules(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Agent Skills Table
CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  skill VARCHAR(50) NOT NULL,
  proficiency INTEGER DEFAULT 1, -- 1-5 scale
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, agent_id, skill)
);

-- 5. Enable RLS
ALTER TABLE agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Organization Isolation)

-- Agent Availability
CREATE POLICY "Users can view availability in their org"
  ON agent_availability FOR SELECT
  USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own availability"
  ON agent_availability FOR UPDATE
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Admins can insert availability"
  ON agent_availability FOR INSERT
  WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Assignment Rules
CREATE POLICY "Users can view rules in their org"
  ON assignment_rules FOR SELECT
  USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage rules"
  ON assignment_rules FOR ALL
  USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Assignment History
CREATE POLICY "Users can view history in their org"
  ON assignment_history FOR SELECT
  USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
  
CREATE POLICY "System/Users can insert history"
  ON assignment_history FOR INSERT
  WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Agent Skills
CREATE POLICY "Users can view skills in their org"
  ON agent_skills FOR SELECT
  USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage skills"
  ON agent_skills FOR ALL
  USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 7. Indexes
CREATE INDEX idx_agent_avail_org ON agent_availability(organization_id);
CREATE INDEX idx_agent_avail_status ON agent_availability(status);
CREATE INDEX idx_assign_rules_org ON assignment_rules(organization_id);
CREATE INDEX idx_assign_hist_conv ON assignment_history(conversation_id);
