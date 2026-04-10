/* Check service_catalog table structure for NOT NULL constraints */
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'service_catalog'
ORDER BY ordinal_position;
