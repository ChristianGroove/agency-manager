/* ================================================================
   DIAGNOSE: Category isolation not working
   ================================================================ */

/* Test 1: Check what categories exist in database */
SELECT 
    sc.id,
    sc.organization_id as org_id,
    sc.name,
    sc.slug,
    sc.icon,
    sc.color,
    o.name as org_name
FROM service_categories sc
JOIN organizations o ON sc.organization_id = o.id
ORDER BY o.name, sc.order_index;

/* Test 2: Check if Barbería Test can see categories */
SELECT * FROM service_categories
WHERE organization_id = (
    SELECT id FROM organizations WHERE name LIKE '%Barber%' LIMIT 1
);

/* Test 3: Check RLS policies on service_categories */
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'service_categories';

/* Test 4: Simulate what Barbería should see (as if authenticated) */
/* This requires being logged in as Barbería user */

/* ================================================================
   EXPECTED RESULTS
   ================================================================
   Test 1: Should show Pixy has 9 categories, Barbería has 0
   Test 2: Should return 0 rows for Barbería
   Test 3: Should show 4 RLS policies
   ================================================================ */
