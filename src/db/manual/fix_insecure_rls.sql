-- Remove insecure "broad" policies
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON organization_settings;
DROP POLICY IF EXISTS "Authenticated users can read settings" ON organization_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON organization_settings;

-- Ensure Tenant Isolation is the primary rule
-- (Assuming "Tenant Isolation" policy already exists and is correct as seen in screenshot)
-- If we need to recreate it to be sure:
-- DROP POLICY IF EXISTS "Tenant Isolation" ON organization_settings;
-- CREATE POLICY "Tenant Isolation" ON organization_settings
--     FOR ALL
--     USING (
--         organization_id IN (
--             SELECT organization_id FROM organization_members 
--             WHERE user_id = auth.uid()
--         )
--     );
