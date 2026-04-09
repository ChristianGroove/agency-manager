-- Create automation_queue table to handle delayed execution resumption
CREATE TABLE IF NOT EXISTS automation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL, -- The ID of the Delay Node where we paused
    resume_at TIMESTAMPTZ NOT NULL, -- When this should run
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT -- Store error if resumption fails
);

-- Index for efficient polling of pending items that are ready to run
CREATE INDEX IF NOT EXISTS idx_automation_queue_poll 
ON automation_queue(status, resume_at) 
WHERE status = 'pending';

-- Index for lookup by execution_id
CREATE INDEX IF NOT EXISTS idx_automation_queue_execution 
ON automation_queue(execution_id);
