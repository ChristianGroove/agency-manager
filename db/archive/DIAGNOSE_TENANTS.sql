-- DIAGNOSTIC SCRIPT
-- 1. Check all organizations the current user (or all users) belongs to.
-- Since we are in SQL editor, we might need to act as a specific user or just check the raw table.

SELECT 
    om.user_id,
    u.email,
    o.id as org_id,
    o.name as org_name,
    o.slug,
    om.role
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
JOIN auth.users u ON u.id = om.user_id
WHERE o.slug = 'pixy-agency' OR o.name LIKE '%pixy%'
ORDER BY u.email;

-- 2. Check roles for the new "Laura" tenant (search by name rough match if ID unknown)
-- First find the org
SELECT * FROM organizations WHERE name ILIKE '%laura%' LIMIT 5;

-- Then check roles for that org (replace ORG_ID_HERE manually if running interactively, or use subquery)
SELECT 
    r.id,
    r.name,
    r.organization_id,
    o.name as org_name
FROM organization_roles r
JOIN organizations o ON o.id = r.organization_id
WHERE o.name ILIKE '%laura%';

-- 3. Check if there are ANY default roles in the system that should be copied
SELECT * FROM organization_roles WHERE organization_id IS NULL; -- assuming system roles might have null org_id?
