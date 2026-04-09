
-- Add 'type' column to services table
ALTER TABLE services 
ADD COLUMN type text DEFAULT 'recurring' CHECK (type IN ('recurring', 'one_off'));

-- Update existing services to be recurring (default)
UPDATE services SET type = 'recurring' WHERE type IS NULL;

-- Example: Set a specific service to "one_off" for testing
-- UPDATE services SET type = 'one_off' WHERE name LIKE '%Mantenimiento%';
