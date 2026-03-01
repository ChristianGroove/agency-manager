-- ============================================================
-- Migration: Add 'product' to service_catalog.type CHECK constraint
-- Context: Multi-space refactoring — Resto spaces use 'product'
--          for menu items (not recurring/one_off B2B services)
-- Date: 2026-03-01
-- ============================================================

-- Step 1: Drop the existing CHECK constraint on the 'type' column
-- The constraint name may vary. This finds and drops it dynamically.
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'service_catalog'
      AND att.attname = 'type'
      AND con.contype = 'c';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE service_catalog DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No CHECK constraint found on service_catalog.type — skipping drop.';
    END IF;
END $$;

-- Step 2: Add the updated CHECK constraint with 'product' included
ALTER TABLE service_catalog
ADD CONSTRAINT service_catalog_type_check
CHECK (type IN ('recurring', 'one_off', 'product'));

-- Verify
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'service_catalog'::regclass AND contype = 'c';
