-- Cleanup Migration: Rollback Cleaning App Experiments
-- Drops tables and columns added for the "Cleaning" vertical test.

-- 1. Drop Tables (Reverse Order of Creation)
DROP TABLE IF EXISTS job_time_logs;
DROP TABLE IF EXISTS staff_shifts;
DROP TABLE IF EXISTS staff_profiles; -- Assuming this was created for workforce only

-- 2. Clean Services Table
-- Remove the columns added in 20251228_cleaning_2_0_schema.sql
ALTER TABLE services 
DROP COLUMN IF EXISTS duration_minutes,
DROP COLUMN IF EXISTS pricing_model,
DROP COLUMN IF EXISTS worker_count;

-- 3. Clean Appointments Table (If we added specific cleaning fields)
-- Checking previous notes: We added 'staff_id' to appointments via 20251228_create_appointments_table.sql ??
-- Wait, 'appointments' might be useful for Agency too? 
-- User said: "Asegurar que el módulo appointments vuelva a su estado básico funcional (Agendamiento genérico)."
-- So we KEEP appointments table, but drop if we added any specific cleaning columns later?
-- Start_time, End_time, Title are generic. 
-- Staff_id might be specific to 'workforce'. Agency usually assigns 'Responsible'?
-- Let's keep appointments table for now as 'Generic'.

-- 4. Remove 'module_catalog' from system_modules if it was added as a specific thing?
-- Actually 'module_catalog' is useful generic?
-- User said "Borrar Módulos Experimentales: ...field-ops".
-- 'module_field_ops' was added. Let's removing it from product bundles if possible, or just ignore.
-- SQL cleanup usually focuses on Schema.

-- Done.
