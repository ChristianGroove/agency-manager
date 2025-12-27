-- Check service_categories structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'service_categories'
ORDER BY ordinal_position;

-- Check if organization_id exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'service_categories' 
    AND column_name = 'organization_id'
) as has_organization_id;

-- Count categories
SELECT COUNT(*) as total_categories FROM service_categories;

-- Check current categories
SELECT * FROM service_categories ORDER BY name;
