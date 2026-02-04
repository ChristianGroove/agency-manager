-- ============================================
-- MIGRATION: cleaning_services → service_catalog
-- Fecha: 2026-02-04
-- Propósito: Unificar catálogo de servicios cross-vertical
-- NOTA: Solo ejecuta si cleaning_services existe
-- ============================================

DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Verificar si cleaning_services existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cleaning_services'
  ) INTO table_exists;

  -- Solo migrar si la tabla existe
  IF table_exists THEN
    RAISE NOTICE 'cleaning_services table found, starting migration...';

    -- PASO 1: Migrar datos existentes
    INSERT INTO service_catalog (
      organization_id,
      name,
      description,
      base_price,
      category,
      type,
      is_visible_in_portal,
      metadata,
      created_at
    )
    SELECT
      organization_id,
      name,
      description,
      base_price,
      'cleaning' as category,
      'one_off' as type,
      true as is_visible_in_portal,
      jsonb_build_object(
        'duration_minutes', estimated_duration_minutes,
        'price_unit', price_unit,
        'is_active', is_active,
        'legacy_id', id::text,
        'migrated_from', 'cleaning_services',
        'migrated_at', NOW()
      ) as metadata,
      created_at
    FROM cleaning_services
    WHERE deleted_at IS NULL;

    -- PASO 2: Crear tabla de mapeo (para rollback si necesario)
    CREATE TABLE IF NOT EXISTS _cleaning_migration_map (
      old_cleaning_service_id UUID PRIMARY KEY,
      new_catalog_item_id UUID NOT NULL,
      migrated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- PASO 3: Poblar mapeo
    INSERT INTO _cleaning_migration_map (old_cleaning_service_id, new_catalog_item_id)
    SELECT 
      cs.id as old_cleaning_service_id,
      sc.id as new_catalog_item_id
    FROM cleaning_services cs
    JOIN service_catalog sc ON sc.metadata->>'legacy_id' = cs.id::text
    WHERE cs.deleted_at IS NULL
      AND sc.category = 'cleaning';

    -- PASO 4: Deprecar tabla antigua (RENOMBRAR, no eliminar)
    ALTER TABLE cleaning_services RENAME TO _deprecated_cleaning_services;

    -- PASO 5: Crear comentario en tabla deprecada
    COMMENT ON TABLE _deprecated_cleaning_services IS 
    'DEPRECATED: Migrado a service_catalog el 2026-02-04. Mantener por 30 días para rollback si necesario.';

    RAISE NOTICE 'Migration complete! cleaning_services renamed to _deprecated_cleaning_services';
  ELSE
    RAISE NOTICE 'cleaning_services table not found, skipping migration (expected for fresh installations)';
  END IF;
END $$;
