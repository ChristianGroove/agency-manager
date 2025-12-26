-- Migration: Fix briefing_responses field_id type
-- Issue: The column is currently UUID and has a FK constraint to a table we likely don't strictly use 
-- for these dynamic field IDs. We need to drop the FK and change the type to TEXT.

ALTER TABLE briefing_responses DROP CONSTRAINT IF EXISTS briefing_responses_field_id_fkey;

ALTER TABLE briefing_responses 
ALTER COLUMN field_id TYPE TEXT;
