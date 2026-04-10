/* ================================================================
   DIAGNOSE: Is catalog isolation working?
   ================================================================ */

/* Test 1: Check service_catalog items per organization */
SELECT 
    sc.id,
    sc.name,
    sc.category,
    o.name as org_name
FROM service_catalog sc
JOIN organizations o ON sc.organization_id = o.id
ORDER BY o.name, sc.name;

/* Test 2: Check if Barbería has any catalog items */
SELECT COUNT(*) as barberia_catalog_count
FROM service_catalog
WHERE organization_id = (
    SELECT id FROM organizations WHERE name LIKE '%Barber%' LIMIT 1
);

/* Test 3: Check Pixy's catalog items */
SELECT COUNT(*) as pixy_catalog_count
FROM service_catalog
WHERE organization_id = (
    SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1
);

/* ================================================================
   EXPECTED RESULTS
   ================================================================
   Test 1: Should show which org owns which catalog items
   Test 2: Barbería should have 0 catalog items
   Test 3: Pixy should have >0 catalog items
   ================================================================ */
