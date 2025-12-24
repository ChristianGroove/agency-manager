-- Add verification_digit to emitters table
ALTER TABLE public.emitters 
ADD COLUMN IF NOT EXISTS verification_digit TEXT;

-- Optional: Add check constraint to ensure Natural persons don't have DV (optional rule, but good for data integrity)
-- ALTER TABLE public.emitters ADD CONSTRAINT check_natural_no_dv CHECK (emitter_type != 'NATURAL' OR verification_digit IS NULL);
-- Keeping it flexible for now as per "No-Break Policy" for existing data, enforcing in UI first.
