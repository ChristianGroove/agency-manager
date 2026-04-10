-- Diagnostic: Check system_modules table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'system_modules' 
AND table_schema = 'public'
ORDER BY ordinal_position;
