-- Migrate legacy service_catalog items to the main services table
-- This restores your old catalog items into the new system.

INSERT INTO services (
    name, 
    description, 
    category, 
    type, 
    frequency, 
    base_price, 
    is_visible_in_portal, 
    is_catalog_item,
    client_id -- explicit null
)
SELECT 
    name, 
    description, 
    category, 
    type, 
    frequency, 
    base_price, 
    is_visible_in_portal, 
    TRUE, -- Mark as Catalog Item
    NULL  -- No client
FROM service_catalog;
