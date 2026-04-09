-- This migration updates the foreign key constraint on subscriptions.invoice_id
-- to automatically set the reference to NULL when an invoice is deleted
-- This prevents orphaned references that could cause client status to incorrectly show as overdue

-- First, drop the existing constraint
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_invoice_id_fkey;

-- Add the new constraint with ON DELETE SET NULL
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_invoice_id_fkey 
FOREIGN KEY (invoice_id) 
REFERENCES invoices(id) 
ON DELETE SET NULL;
