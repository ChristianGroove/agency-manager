-- Verifies the actual SLUG for organizations with 'Cleanity' in the name
-- Run this to verify the exact casing needed for the activation script.

SELECT id, name, slug FROM organizations WHERE name ILIKE '%Cleanity%' OR slug ILIKE '%cleanity%';
