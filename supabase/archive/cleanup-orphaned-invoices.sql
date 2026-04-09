-- Clean up orphaned invoice_id references in subscriptions table
-- This sets any invoice_id to NULL if it references an invoice that no longer exists

UPDATE subscriptions
SET invoice_id = NULL
WHERE invoice_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = subscriptions.invoice_id
  );
