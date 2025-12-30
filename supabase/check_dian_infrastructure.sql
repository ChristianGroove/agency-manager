-- VERIFICACIÓN DE INFRAESTRUCTURA DIAN (FASE 3)
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- 1. Verificar existencia de tabla y columnas
SELECT 
    table_name, 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'dian_documents'
ORDER BY ordinal_position;

-- 2. Verificar existencia del ENUM
SELECT typname, enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'dian_status';

-- 3. Verificar Policies (RLS)
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'dian_documents';

-- 4. Verificar Indices y Constrains
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'dian_documents';

-- 5. Verificar Integridad (Debe estar VACÍA - No escribimos aún)
SELECT count(*) as total_dian_docs FROM dian_documents;

-- 6. Verificar Restricción FK (invoice_id)
SELECT 
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'dian_documents';

COMMIT;
