-- Add is_late_issued column to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS is_late_issued BOOLEAN DEFAULT FALSE;

-- Add metadata column to invoices (just in case we need more flexibility later)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
