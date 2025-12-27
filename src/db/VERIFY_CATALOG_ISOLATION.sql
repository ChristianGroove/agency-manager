-- Verify catalog is isolated correctly

-- 1. Check if organization_id column exists and is populated
SELECT 
    COUNT(*) FILTER (WHERE organization_id IS NULL) as null_org_count,
    COUNT(*) FILTER (WHERE organization_id IS NOT NULL) as has_org_count,
    COUNT(*) as total
FROM service_catalog;

-- 2. Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'service_catalog';

-- 3. Check policies exist
SELECT 
    policyname,
    cmd as command,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'service_catalog';

-- 4. Count items per organization
SELECT 
    COALESCE(o.name, 'NO ORGANIZATION') as org_name,
    o.id as org_id,
    COUNT(sc.id) as item_count
FROM service_catalog sc
LEFT JOIN organizations o ON sc.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY item_count DESC;

-- 5. Check current user's organization memberships
SELECT 
    o.name as org_name,
    o.id as org_id,
    om.role
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
WHERE om.user_id = auth.uid();

-- 6. Test query that frontend uses (should only show current org's items)
SELECT 
    sc.*,
    o.name as org_name
FROM service_catalog sc
JOIN organizations o ON sc.organization_id = o.id
WHERE sc.organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
)
ORDER BY sc.base_price DESC;
