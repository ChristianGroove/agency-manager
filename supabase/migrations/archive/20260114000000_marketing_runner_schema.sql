-- Add execution control fields to marketing_enrollments
ALTER TABLE marketing_enrollments 
ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS execution_logs JSONB DEFAULT '[]'::JSONB;

-- Index for efficient polling (The heartbeat query)
CREATE INDEX IF NOT EXISTS idx_enrollments_next_run ON marketing_enrollments(next_run_at) 
WHERE status = 'active';

-- Add a partial index to quickly find active enrollments by org (Tenant Isolation)
CREATE INDEX IF NOT EXISTS idx_enrollments_active_org ON marketing_enrollments(organization_id, status) 
WHERE status = 'active';
