-- Add emitter_id to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS emitter_id UUID REFERENCES billing_profiles(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quotes_emitter_id ON quotes(emitter_id);
