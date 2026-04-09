-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Workflows Table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    trigger_type VARCHAR(50) NOT NULL, -- 'webhook', 'event', 'schedule'
    trigger_config JSONB DEFAULT '{}'::jsonb, -- e.g. { "event": "lead.created" }
    -- Stores the graph structure (Nodes & Edges) compatible with React Flow
    -- Structure: { "nodes": [...], "edges": [...] }
    definition JSONB DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_run_at TIMESTAMPTZ
);

-- Indexes for Workflows
CREATE INDEX idx_workflows_org ON workflows(organization_id);
CREATE INDEX idx_workflows_status ON workflows(organization_id, is_active);

-- 2. Workflow Executions (Runtime State)
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'paused'
    context JSONB DEFAULT '{}'::jsonb, -- Variables gathered during execution
    current_step_id VARCHAR(255), -- ID of the current node being processed
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for Executions
CREATE INDEX idx_wf_executions_wf ON workflow_executions(workflow_id);
CREATE INDEX idx_wf_executions_status ON workflow_executions(status);
CREATE INDEX idx_wf_executions_org ON workflow_executions(organization_id);

-- 3. Workflow Logs (Audit Trail)
CREATE TABLE workflow_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id VARCHAR(255),
    level VARCHAR(20) DEFAULT 'info', -- 'info', 'warn', 'error'
    message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wf_logs_execution ON workflow_logs(execution_id);

-- 4. RLS Policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;

-- Workflows Policies
CREATE POLICY "Users can view their organization workflows"
    ON workflows FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their organization workflows"
    ON workflows FOR ALL
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Executions Policies
CREATE POLICY "Users can view executions"
    ON workflow_executions FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Logs Policies
CREATE POLICY "Users can view logs"
    ON workflow_logs FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 5. Triggers
-- Auto-update updated_at for workflows
CREATE OR REPLACE FUNCTION update_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflows_modtime
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_timestamp();
