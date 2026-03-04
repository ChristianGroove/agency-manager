-- Verificación rápida de Apps System
-- Ejecuta esto en Supabase SQL Editor para verificar

-- 1. Verificar apps creadas
SELECT id, name, price_monthly, trial_days 
FROM saas_apps 
ORDER BY sort_order;

-- Esperado: 3 apps

-- 2. Verificar módulos por app
SELECT 
    a.name as app_name,
    COUNT(am.id) as module_count
FROM saas_apps a
LEFT JOIN saas_app_modules am ON a.id = am.app_id
GROUP BY a.id, a.name
ORDER BY a.sort_order;

-- Esperado: Marketing (5), Cleaning (5), Consulting (5)

-- 3. Verificar función de assignment existe
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'assign_app_to_organization';

-- Esperado: 1 fila

-- 4. Verificar columna en organizations
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name IN ('active_app_id', 'app_activated_at');

-- Esperado: 2 columnas

-- ✅ Si todo esto retorna datos, la migración fue exitosa!
