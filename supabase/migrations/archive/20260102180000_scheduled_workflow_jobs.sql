-- Scheduled Workflow Jobs Migration
-- This table stores workflow executions that are waiting to resume after a delay

-- Create enum for job status
DO $$ BEGIN
    CREATE TYPE scheduled_job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Scheduled jobs table
CREATE TABLE IF NOT EXISTS scheduled_workflow_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    
    -- Job scheduling details
    status scheduled_job_status NOT NULL DEFAULT 'pending',
    scheduled_for TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Execution context (needed to resume workflow)
    resume_from_node_id TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    
    -- Retry handling
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_time 
    ON scheduled_workflow_jobs (status, scheduled_for) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_org 
    ON scheduled_workflow_jobs (organization_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_workflow 
    ON scheduled_workflow_jobs (workflow_id);

-- RLS Policies
ALTER TABLE scheduled_workflow_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their organization's scheduled jobs
CREATE POLICY "Users can view org scheduled jobs"
    ON scheduled_workflow_jobs
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Users can insert scheduled jobs for their organization
CREATE POLICY "Users can create org scheduled jobs"
    ON scheduled_workflow_jobs
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Users can update their organization's scheduled jobs
CREATE POLICY "Users can update org scheduled jobs"
    ON scheduled_workflow_jobs
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Service role can do everything (for cron jobs)
CREATE POLICY "Service role full access to scheduled jobs"
    ON scheduled_workflow_jobs
    FOR ALL
    USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_scheduled_job_timestamp ON scheduled_workflow_jobs;
CREATE TRIGGER trigger_update_scheduled_job_timestamp
    BEFORE UPDATE ON scheduled_workflow_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_job_timestamp();

-- Function to get pending jobs due for execution
CREATE OR REPLACE FUNCTION get_pending_scheduled_jobs(batch_size INTEGER DEFAULT 10)
RETURNS SETOF scheduled_workflow_jobs AS $$
BEGIN
    RETURN QUERY
    UPDATE scheduled_workflow_jobs
    SET status = 'processing', started_at = now(), attempts = attempts + 1
    WHERE id IN (
        SELECT id FROM scheduled_workflow_jobs
        WHERE status = 'pending'
        AND scheduled_for <= now()
        AND attempts < max_attempts
        ORDER BY scheduled_for ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE scheduled_workflow_jobs IS 'Stores delayed workflow executions waiting to resume';
