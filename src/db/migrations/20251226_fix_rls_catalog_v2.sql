-- Clean RLS Fix
-- Drops all known variations of policies we might have created to avoid conflicts.

-- 1. Enable RLS (Just in case)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential existing policies (Blind cleanup)
DROP POLICY IF EXISTS "Users can view their own services" ON services;
DROP POLICY IF EXISTS "Users can view their own services OR catalog items" ON services; -- The one causing error 42710
DROP POLICY IF EXISTS "Allow view catalog and own services" ON services;
DROP POLICY IF EXISTS "Access Services & Catalog" ON services;

-- 3. Create the single, definitive policy
CREATE POLICY "Access Services & Catalog"
ON services FOR SELECT
TO authenticated
USING (
    is_catalog_item = TRUE 
    OR 
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);
