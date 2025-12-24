
-- Add document_type to invoices if it doesn't exist
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS document_type TEXT CHECK (document_type IN ('CUENTA_DE_COBRO', 'FACTURA_ELECTRONICA', 'COTIZACION'));

-- Optional: Set default if needed, though app handles it
-- ALTER TABLE public.invoices ALTER COLUMN document_type SET DEFAULT 'CUENTA_DE_COBRO';

NOTIFY pgrst, 'reload schema';
