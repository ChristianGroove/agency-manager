-- Query diagnóstico: Verificar si hay trabajos creados
-- Ejecutar esto en SQL Editor de Supabase

-- 1. Contar trabajos totales en appointments
SELECT COUNT(*) as total_appointments FROM appointments;

-- 2. Ver los últimos 5 trabajos creados (ordenados por fecha de creación)
SELECT 
    id,
    title,
    organization_id,
    client_id,
    service_id,
    staff_id,
    service_vertical,
    status,
    start_time,
    created_at
FROM appointments
ORDER BY created_at DESC
LIMIT 5;

-- 3. Buscar trabajos de limpieza específicamente
SELECT 
    COUNT(*) as cleaning_jobs_count
FROM appointments
WHERE service_vertical = 'cleaning';

-- 4. Ver organizaciones existentes
SELECT id, name, slug FROM organizations ORDER BY created_at DESC LIMIT 5;
