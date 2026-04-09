-- Add deleted_at column for Soft Deletes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- Create indexes for performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX IF NOT EXISTS idx_briefings_deleted_at ON briefings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON quotes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);

-- Update RLS policies?
-- Usually, we might want to hide deleted items from normal SELECTs via RLS,
-- BUT that makes "viewing trash" hard if we use the same role.
-- Better to filter in the application queries for flexibility (Admins might want to see deleted stuff in a special view).
