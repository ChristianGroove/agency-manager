-- Check structure of saas_product_modules table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'saas_product_modules'
ORDER BY ordinal_position;
