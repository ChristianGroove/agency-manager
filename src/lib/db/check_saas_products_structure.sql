/* Check saas_products table structure */
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'saas_products'
ORDER BY ordinal_position;
