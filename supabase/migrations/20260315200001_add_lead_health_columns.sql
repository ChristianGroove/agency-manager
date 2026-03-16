-- Migration: Add Lead Health and Value Columns
-- Description: Adds 'score', 'last_scored_at' and 'estimated_value' to leads table.

-- 1. Add score column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'score') THEN
        ALTER TABLE leads ADD COLUMN score INT4 DEFAULT 0;
    END IF;
END $$;

-- 2. Add last_scored_at column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_scored_at') THEN
        ALTER TABLE leads ADD COLUMN last_scored_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Add estimated_value column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'estimated_value') THEN
        ALTER TABLE leads ADD COLUMN estimated_value NUMERIC;
    END IF;
END $$;

-- 4. Sync data from legacy 'value' column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'value') THEN
        UPDATE leads SET estimated_value = value WHERE estimated_value IS NULL AND value IS NOT NULL;
    END IF;
END $$;

-- 5. Create performance indices
CREATE INDEX IF NOT EXISTS idx_leads_org_score ON leads (organization_id, score);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads (updated_at);
