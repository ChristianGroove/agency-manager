-- Check service_catalog table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'service_catalog'
ORDER BY ordinal_position;

-- Check if organization_id column exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'service_catalog' 
    AND column_name = 'organization_id'
) as has_organization_id;

-- Count total items in catalog
SELECT COUNT(*) as total_items FROM service_catalog;

-- Check Pixy Agency ID
SELECT id, name FROM organizations WHERE name = 'Pixy Agency';
