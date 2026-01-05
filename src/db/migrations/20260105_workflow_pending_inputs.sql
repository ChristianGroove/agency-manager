-- Migration: Add workflow pending inputs table for wait nodes
-- This table stores state when a workflow is waiting for user input

CREATE TABLE IF NOT EXISTS workflow_pending_inputs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- What we're waiting for
    input_type TEXT NOT NULL CHECK (input_type IN ('button_click', 'text', 'any', 'image', 'location', 'audio')),
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'completed', 'timeout', 'cancelled')),
    response JSONB,  -- Stores the actual response when received
    
    -- Timeout
    timeout_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Unique constraint: one pending input per node per execution
    UNIQUE(execution_id, node_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pending_inputs_status ON workflow_pending_inputs(status) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_pending_inputs_conversation ON workflow_pending_inputs(conversation_id) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_pending_inputs_timeout ON workflow_pending_inputs(timeout_at) WHERE status = 'waiting' AND timeout_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pending_inputs_org ON workflow_pending_inputs(organization_id);

-- Add RLS
ALTER TABLE workflow_pending_inputs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see pending inputs for their organization
CREATE POLICY "Users can view org pending inputs"
    ON workflow_pending_inputs
    FOR SELECT
    USING (organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid()
    ));

-- Service role can manage all
CREATE POLICY "Service role full access"
    ON workflow_pending_inputs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE workflow_pending_inputs IS 'Stores pending user input state for workflow wait nodes';
COMMENT ON COLUMN workflow_pending_inputs.config IS 'WaitInputNodeData configuration including validation rules and branches';
COMMENT ON COLUMN workflow_pending_inputs.response IS 'The actual user response when received';
