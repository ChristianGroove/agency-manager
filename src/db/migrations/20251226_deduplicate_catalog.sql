-- Cleanup Duplicates in Catalog
-- This script deletes duplicate catalog items, keeping only one unique entry per name.

DELETE FROM services a USING services b
WHERE a.id < b.id            -- Delete the older ID (or purely based on ID comparison)
AND a.name = b.name          -- Same Name
AND a.is_catalog_item = TRUE -- Both are catalog items
AND b.is_catalog_item = TRUE;
