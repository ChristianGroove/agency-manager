-- Check if get_org_modules_with_fallback RPC function exists
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_org_modules_with_fallback'
  AND n.nspname = 'public';
