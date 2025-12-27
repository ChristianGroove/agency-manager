-- Quick verification for service_categories migration

-- 1. Check if table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'service_categories'
) as table_exists;

-- 2. Count total categories
SELECT COUNT(*) as total_categories FROM service_categories;

-- 3. Categories by organization
SELECT 
    o.name as org_name,
    COUNT(sc.id) as count,
    STRING_AGG(sc.name, ', ') as category_names
FROM organizations o
LEFT JOIN service_categories sc ON o.id = sc.organization_id
GROUP BY o.id, o.name
ORDER BY count DESC;

-- 4. Show Pixy's categories in detail
SELECT 
    id,
    name,
    slug,
    icon,
    color,
    order_index,
    created_at
FROM service_categories
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1)
ORDER BY order_index;
