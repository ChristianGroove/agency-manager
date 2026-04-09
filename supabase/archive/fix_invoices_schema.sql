-- Add emitter_id to INVOICES if it doesn't exist
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS emitter_id UUID REFERENCES public.emitters(id);

-- Reload Schema Cache to recognize the new column
NOTIFY pgrst, 'reload config';
