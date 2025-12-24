-- Add emitter_id to services table
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS emitter_id UUID REFERENCES public.emitters(id);

-- Add document_type to services table (for persistence as requested)
-- We persist this to ensure historical accuracy if rules change later
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS document_type TEXT; -- 'CUENTA_DE_COBRO' | 'FACTURA_ELECTRONICA'

-- Backfill existing services if wanted? 
-- For now, we leave them NULL or could set to default emitter.
-- Let's attempt to backfill with the default emitter if exists.
DO $$
DECLARE
    default_emitter_id UUID;
    default_doc_type TEXT;
BEGIN
    SELECT id, allowed_document_types[1] INTO default_emitter_id, default_doc_type 
    FROM public.emitters WHERE is_default = true LIMIT 1;
    
    IF default_emitter_id IS NOT NULL THEN
        UPDATE public.services 
        SET emitter_id = default_emitter_id,
            document_type = default_doc_type
        WHERE emitter_id IS NULL;
    END IF;
END $$;

-- Reload cache
NOTIFY pgrst, 'reload config';
