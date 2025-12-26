-- Add flag to distinguish Catalog Items from Client Services
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS is_visible_in_portal BOOLEAN DEFAULT FALSE;

-- Optional: Mark existing items as visible if they look like templates (e.g. no associated client or based on heuristic)
-- For now, we default to FALSE to be safe, User needs to manually toggle them or run a bulk update.
-- Example update for User to run:
-- UPDATE services SET is_visible_in_portal = true WHERE client_id IS NULL; -- If you have null client_ids
-- OR
-- UPDATE services SET is_visible_in_portal = true; -- To start with everything visible and then hide some.
