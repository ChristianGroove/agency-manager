-- Verificación Rápida de Esquema de appointments
-- Ejecuta esto en Supabase SQL Editor para verificar que las columnas existen

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name IN (
    'service_id',
    'service_vertical', 
    'address_text',
    'location_type'
)
ORDER BY column_name;

-- Si NO ves las 4 columnas arriba, necesitas ejecutar las migraciones
