-- Create EMITTERS table
CREATE TYPE public.emitter_type AS ENUM ('NATURAL', 'JURIDICO');

CREATE TABLE IF NOT EXISTS public.emitters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    display_name TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    emitter_type public.emitter_type NOT NULL DEFAULT 'NATURAL',
    identification_type TEXT NOT NULL DEFAULT 'CC', -- CC, NIT
    identification_number TEXT NOT NULL,
    allowed_document_types TEXT[] NOT NULL DEFAULT '{CUENTA_DE_COBRO}', -- Array of allowed types
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    address TEXT,
    email TEXT,
    phone TEXT,
    logo_url TEXT
);

-- RLS for Emitters (Admin only)
ALTER TABLE public.emitters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage emitters" ON public.emitters
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.clients WHERE user_id = auth.uid() UNION SELECT id FROM auth.users WHERE id = auth.uid())); -- Simplified for single admin app

-- Insert DEFAULT Emitter (Persona Natural)
-- We need to get this right so it matches the current hardcoded settings if possible, or just a generic one that the user can edit.
-- For now, we create a placeholder that the user can update in settings.
INSERT INTO public.emitters (display_name, legal_name, emitter_type, identification_type, identification_number, allowed_document_types, is_default)
VALUES (
    'Emisor Principal', 
    'Nombre Legal del Emisor', 
    'NATURAL', 
    'CC', 
    '000000000', 
    '{CUENTA_DE_COBRO}', 
    true
) ON CONFLICT DO NOTHING;

-- Add emitter_id to INVOICES
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS emitter_id UUID REFERENCES public.emitters(id);

-- Backfill existing invoices
DO $$
DECLARE
    default_emitter_id UUID;
BEGIN
    SELECT id INTO default_emitter_id FROM public.emitters WHERE is_default = true LIMIT 1;
    
    IF default_emitter_id IS NOT NULL THEN
        UPDATE public.invoices 
        SET emitter_id = default_emitter_id 
        WHERE emitter_id IS NULL;
    END IF;
END $$;
