-- Migration: Add settled_at to staff_work_logs for hybrid payroll system
-- Created: 2025-12-28
-- Description: Enables tracking of which work hours have been settled/paid

-- Add settled_at column to track when work hours were liquidated
ALTER TABLE staff_work_logs 
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

-- Add index for efficient queries on unsettled hours
CREATE INDEX IF NOT EXISTS idx_work_logs_unsettled 
ON staff_work_logs(staff_id, organization_id) 
WHERE settled_at IS NULL;

-- Add index for settlement history queries
CREATE INDEX IF NOT EXISTS idx_work_logs_settled_date 
ON staff_work_logs(staff_id, settled_at) 
WHERE settled_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN staff_work_logs.settled_at IS 
'Timestamp when these work hours were settled/liquidated. NULL means unpaid/pending.';
