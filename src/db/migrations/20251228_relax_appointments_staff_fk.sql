-- Migration: Relax Appointments Staff FK
-- ID: 20251228_relax_appointments_staff_fk
-- Goal: Remove strict FK to 'staff_profiles' to allow 'cleaning_staff_profiles' (or others) to be assigned.

DO $$
BEGIN
    -- Drop the constraint if it exists. 
    -- The name is usually 'appointments_staff_id_fkey', but we'll try to drop it safely.
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_staff_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments DROP CONSTRAINT appointments_staff_id_fkey;
    END IF;
    
    -- Also drop index if strictly tied? No, index is fine.

    -- Optional: If we want to strictly enforce it to cleaning_staff, we could add a NEW constraint, 
    -- but for now we want flexibility as 'staff_id' might be polymorphic.
END $$;
