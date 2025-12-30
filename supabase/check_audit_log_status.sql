-- Verificar estado de billing_audit_log
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si la tabla existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'billing_audit_log'
) as table_exists;

-- 2. Ver estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'billing_audit_log'
ORDER BY ordinal_position;

-- 3. Ver policies existentes
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'billing_audit_log';

-- 4. Ver triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'billing_audit_log';

-- 5. Ver funciones relacionadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%audit%';

-- 6. Contar registros (si tiene datos)
SELECT COUNT(*) as total_entries FROM billing_audit_log;
