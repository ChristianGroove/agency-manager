-- Update Quote Status Constraints to support full lifecycle
-- Adding 'converted' (facturada), 'expired' (vencida)
-- Ensuring existing constraints are replaced

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes
ADD CONSTRAINT quotes_status_check
CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted', 'expired'));
