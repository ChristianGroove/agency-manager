-- Find all tables related to products and modules
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%product%'
    OR table_name LIKE '%module%'
  )
ORDER BY table_name;
