-- ============================================
-- SCRIPT DE VERIFICACIÓN PRE-MIGRACIÓN
-- Verifica el estado de las tablas antes de aplicar nuevas migraciones
-- ============================================

-- 1. VERIFICAR EXISTENCIA DE TABLAS PRINCIPALES
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'VERIFICACIÓN DE TABLAS PRINCIPALES';
    RAISE NOTICE '===========================================';
END $$;

-- Verificar tabla organizations
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations')
        THEN '✅ organizations - EXISTS'
        ELSE '❌ organizations - NOT FOUND'
    END AS status;

-- Verificar tabla platform_settings
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_settings')
        THEN '✅ platform_settings - EXISTS'
        ELSE '❌ platform_settings - NOT FOUND'
    END AS status;

-- Verificar tabla system_modules
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_modules')
        THEN '✅ system_modules - EXISTS'
        ELSE '❌ system_modules - NOT FOUND'
    END AS status;

-- Verificar tabla saas_products
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saas_products')
        THEN '✅ saas_products - EXISTS'
        ELSE '❌ saas_products - NOT FOUND'
    END AS status;

-- 2. VERIFICAR COLUMNAS DE ORGANIZATIONS
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'VERIFICACIÓN DE COLUMNAS EN ORGANIZATIONS';
    RAISE NOTICE '===========================================';
END $$;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
  AND column_name IN (
      'vertical',
      'subscription_product_id',
      'manual_module_overrides',
      'admin_domain',
      'portal_domain',
      'use_custom_domains',
      'custom_admin_domain',
      'custom_portal_domain',
      'branding_tier_id',
      'branding_custom_config'
  )
ORDER BY column_name;

-- 3. VERIFICAR MÓDULOS EXISTENTES
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'MÓDULOS EN SYSTEM_MODULES';
    RAISE NOTICE '===========================================';
END $$;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_modules')
        THEN (SELECT COUNT(*)::text || ' módulos encontrados' FROM public.system_modules)
        ELSE '❌ Tabla system_modules no existe'
    END AS module_count;

-- Listar módulos si la tabla existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_modules') THEN
        RAISE NOTICE 'Listado de módulos:';
    END IF;
END $$;

-- Query condicional basado en columnas existentes
DO $$
DECLARE
    has_category BOOLEAN;
    has_is_core BOOLEAN;
    module_rec RECORD;
BEGIN
    -- Check if new columns exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'system_modules'
          AND column_name = 'category'
    ) INTO has_category;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'system_modules'
          AND column_name = 'is_core'
    ) INTO has_is_core;
    
    -- Display modules with available columns
    FOR module_rec IN 
        SELECT key, name FROM public.system_modules ORDER BY key
    LOOP
        IF has_category AND has_is_core THEN
            -- All columns available
            RAISE NOTICE '  - % (%) [category: %, core: %]', 
                module_rec.name, 
                module_rec.key,
                (SELECT category FROM public.system_modules WHERE key = module_rec.key),
                (SELECT is_core FROM public.system_modules WHERE key = module_rec.key);
        ELSE
            -- Basic columns only
            RAISE NOTICE '  - % (%)', module_rec.name, module_rec.key;
        END IF;
    END LOOP;
    
    IF NOT has_category THEN
        RAISE NOTICE '';
        RAISE NOTICE '  ⚠️  Columnas de Fase 2 (category, is_core, etc.) NO EXISTEN aún';
    END IF;
END $$;

-- 4. VERIFICAR COLUMNAS DE SYSTEM_MODULES
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'COLUMNAS EN SYSTEM_MODULES';
    RAISE NOTICE '===========================================';
END $$;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('dependencies', 'conflicts_with', 'compatible_verticals', 'is_core', 'category')
        THEN '🆕 NUEVA (Fase 2)'
        ELSE '✅ EXISTENTE'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'system_modules'
ORDER BY 
    CASE 
        WHEN column_name IN ('dependencies', 'conflicts_with', 'compatible_verticals', 'is_core', 'category')
        THEN 2
        ELSE 1
    END,
    column_name;

-- 5. VERIFICAR TABLAS DE BRANDING (nuevas)
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'TABLAS DE BRANDING (FASE 1)';
    RAISE NOTICE '===========================================';
END $$;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'branding_tiers')
        THEN '✅ branding_tiers - ALREADY EXISTS'
        ELSE '🆕 branding_tiers - WILL BE CREATED'
    END AS status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_add_ons')
        THEN '✅ organization_add_ons - ALREADY EXISTS'
        ELSE '🆕 organization_add_ons - WILL BE CREATED'
    END AS status;

-- 6. VERIFICAR FUNCIONES PL/pgSQL
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'FUNCIONES PL/pgSQL';
    RAISE NOTICE '===========================================';
END $$;

SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name IN ('validate_module_activation', 'auto_resolve_dependencies', 'get_orphaned_modules', 'upgrade_branding_tier')
        THEN '🆕 NUEVA'
        ELSE '✅ EXISTENTE'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
      'validate_module_activation',
      'auto_resolve_dependencies',
      'get_orphaned_modules',
      'upgrade_branding_tier'
  );

-- 7. RESUMEN Y RECOMENDACIONES
DO $$
DECLARE
    has_system_modules BOOLEAN;
    has_organizations BOOLEAN;
    module_count INTEGER;
    has_new_columns BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'RESUMEN Y RECOMENDACIONES';
    RAISE NOTICE '===========================================';
    
    -- Check system_modules
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'system_modules'
    ) INTO has_system_modules;
    
    -- Check organizations
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'organizations'
    ) INTO has_organizations;
    
    -- Count modules
    IF has_system_modules THEN
        SELECT COUNT(*) INTO module_count FROM public.system_modules;
    ELSE
        module_count := 0;
    END IF;
    
    -- Check if new columns exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'system_modules'
          AND column_name = 'dependencies'
    ) INTO has_new_columns;
    
    -- Recommendations
    RAISE NOTICE '';
    
    IF NOT has_organizations THEN
        RAISE NOTICE '❌ BLOCKER: Tabla organizations no existe';
        RAISE NOTICE '   → Crear tabla organizations primero';
    ELSE
        RAISE NOTICE '✅ Tabla organizations existe';
    END IF;
    
    IF NOT has_system_modules THEN
        RAISE NOTICE '❌ BLOCKER: Tabla system_modules no existe';
        RAISE NOTICE '   → Necesitas crear tabla system_modules antes de Fase 2';
    ELSIF module_count = 0 THEN
        RAISE NOTICE '⚠️  WARNING: system_modules existe pero está vacía';
        RAISE NOTICE '   → Aplicar seed de módulos antes de Fase 2';
    ELSIF module_count < 10 THEN
        RAISE NOTICE '⚠️  WARNING: Solo % módulos encontrados', module_count;
        RAISE NOTICE '   → Considera agregar más módulos';
    ELSE
        RAISE NOTICE '✅ system_modules tiene % módulos', module_count;
    END IF;
    
    IF has_new_columns THEN
        RAISE NOTICE '⚠️  WARNING: Columnas de Fase 2 ya existen';
        RAISE NOTICE '   → La migración 20250103 podría fallar (usar IF NOT EXISTS)';
    ELSE
        RAISE NOTICE '✅ Columnas de Fase 2 no existen, listo para migración';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'ORDEN DE APLICACIÓN RECOMENDADO:';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '1. 20250101000000_domain_management_system.sql';
    RAISE NOTICE '2. 20250102000000_branding_tiers.sql';
    RAISE NOTICE '3. 20250103000000_smart_modules.sql';
    RAISE NOTICE '';
    
END $$;
