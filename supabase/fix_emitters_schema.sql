-- Ensure Table Exists
CREATE TYPE public.emitter_type AS ENUM ('NATURAL', 'JURIDICO');
-- Ignore error if type exists (Postgres doesn't support IF NOT EXISTS for types easily without a block)
DO $$ BEGIN
    CREATE TYPE public.emitter_type AS ENUM ('NATURAL', 'JURIDICO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.emitters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    display_name TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    emitter_type public.emitter_type NOT NULL DEFAULT 'NATURAL',
    identification_type TEXT NOT NULL DEFAULT 'CC',
    identification_number TEXT NOT NULL,
    allowed_document_types TEXT[] NOT NULL DEFAULT '{CUENTA_DE_COBRO}', 
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    address TEXT,
    email TEXT,
    phone TEXT,
    logo_url TEXT
);

-- Enable RLS
ALTER TABLE public.emitters ENABLE ROW LEVEL SECURITY;
-- Policy (Dropping if exists to avoid conflict or just creating if not?)
-- Simplest is do nothing if exists, but we can just run it and ignore error if we want, or use a DO block.
-- For speed, we assume it might exist.

-- Add Verification Digit Column
ALTER TABLE public.emitters 
ADD COLUMN IF NOT EXISTS verification_digit TEXT;

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
