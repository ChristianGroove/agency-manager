-- Find all tables with 'category' or 'service' in the name
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%category%' 
    OR table_name LIKE '%service%'
  )
ORDER BY table_name;

-- Check service_catalog structure (we know this exists)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'service_catalog'
ORDER BY ordinal_position;
