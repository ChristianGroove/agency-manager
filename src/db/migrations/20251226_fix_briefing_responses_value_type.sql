-- Migration: Fix briefing_responses value column type to JSONB
-- This ensures the column is JSONB even if it was created as TEXT

-- Drop the old column if it's not JSONB and recreate it
DO $$ 
BEGIN
    -- Try to alter the column type to JSONB
    -- This will fail if there's incompatible data, but we'll handle that
    BEGIN
        ALTER TABLE briefing_responses 
        ALTER COLUMN value TYPE JSONB USING value::jsonb;
    EXCEPTION
        WHEN OTHERS THEN
            -- If it fails, drop and recreate
            ALTER TABLE briefing_responses DROP COLUMN IF EXISTS value;
            ALTER TABLE briefing_responses ADD COLUMN value JSONB NOT NULL;
    END;
END $$;
