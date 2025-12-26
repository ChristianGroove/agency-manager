-- Phase 20: Catalog Architecture Refactor
-- 1. Add strict flag for Catalog Items
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS is_catalog_item BOOLEAN DEFAULT FALSE;

-- 2. Add reference to Briefing Template (so the instance knows which form to trigger)
ALTER TABLE services
ADD COLUMN IF NOT EXISTS briefing_template_id UUID REFERENCES briefing_templates(id);

-- 3. Data Fix: Attempt to mark existing "Master" services as catalog
-- Heuristic: If it has no client_id, it is likely a catalog item.
UPDATE services 
SET is_catalog_item = TRUE 
WHERE client_id IS NULL;

-- 4. Clean up: Ensure services with clients are NOT catalog items
UPDATE services 
SET is_catalog_item = FALSE 
WHERE client_id IS NOT NULL;
