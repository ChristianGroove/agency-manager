-- Add emitter_id to quotes table referencing billing_emitters
-- NOTE: Corrected to reference 'billing_emitters' based on system configuration

DO $$
BEGIN
    -- 1. Add column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'emitter_id') THEN
        ALTER TABLE quotes ADD COLUMN emitter_id UUID;
    END IF;

    -- 2. Drop old constraint if it points to billing_profiles (safety cleanup)
    -- We try to drop any constraint named quotes_emitter_id_fkey just in case it was created wrong
    -- Or use a unique name for the new one.
    
    -- Let's just try basic ALTER. Supabase SQL editor is forgiving.
END $$;

-- 2. Asegurar la FK correcta a emitters (tabla real encontrada en src/lib/actions/emitters.ts)
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_emitter_id_fkey;
ALTER TABLE quotes ADD CONSTRAINT quotes_emitter_id_fkey FOREIGN KEY (emitter_id) REFERENCES emitters(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_quotes_emitter_id ON quotes(emitter_id);
