-- Remove the restrictive type check constraint to allow new notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Optionally, add a new constraint with the expanded list, or leave it open.
-- Leaving it open allows for easier future additions without migrations.
-- If we wanted to be strict:
-- ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
-- CHECK (type IN ('payment_reminder', 'payment_due', 'invoice_generated', 'quote_accepted', 'quote_rejected', 'service_interest', 'briefing_submitted'));
