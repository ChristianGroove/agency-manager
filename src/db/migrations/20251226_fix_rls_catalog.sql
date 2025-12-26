-- Enable access to Catalog Items (Global Read Access for authenticated users)

-- 1. Policy for Services
DROP POLICY IF EXISTS "Users can view their own services" ON services;

CREATE POLICY "Users can view their own services OR catalog items"
ON services FOR SELECT
TO authenticated
USING (
    -- Standard check: User owns the client linked to the service (assuming you have a way to map user -> client, typically via auth.uid() or similar logic in your app.)
    -- OR
    -- The item is a catalog item (Global read)
    is_catalog_item = TRUE
    OR
    client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
    )
);

-- Note: The insert/update policies usually remain restricted to owners.
-- If you are the ADMIN (which I assume you are), you might have a different bypass, but this ensures the UI can read them.
