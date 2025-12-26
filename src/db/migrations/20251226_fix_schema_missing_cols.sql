-- Consolidated Fix Script for Service Catalog Refactor
-- Run this to ensure ALL required columns exist.

-- 1. Flags and References
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_visible_in_portal BOOLEAN DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_catalog_item BOOLEAN DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS briefing_template_id UUID;

-- 2. Pricing Fields
-- 'services' traditionally has 'amount'. Catalog items use 'base_price'.
-- We ensure 'base_price' exists so the portfolio form works.
ALTER TABLE services ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0;

-- 3. Relax Constants
ALTER TABLE services ALTER COLUMN client_id DROP NOT NULL;

-- 4. category / type / frequency (Ensure they exist if they were only in service_catalog)
ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS type TEXT; -- recurring/one_off
ALTER TABLE services ADD COLUMN IF NOT EXISTS frequency TEXT; -- monthly/yearly

-- 5. Data Cleanup (Optional but good)
-- update services set is_catalog_item = true where client_id is null;
