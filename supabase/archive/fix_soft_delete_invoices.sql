-- 1. Fix data integrity for existing soft-deleted services
-- Sets status to 'cancelled' for any pending/overdue invoice linked to a deleted service
UPDATE invoices
SET status = 'cancelled'
WHERE service_id IN (
    SELECT id FROM services WHERE deleted_at IS NOT NULL
)
AND status IN ('pending', 'overdue');

-- 2. Optional: Check if we have any invoices without service_id that should have one?
-- (For now, just fixing the reported issue)
