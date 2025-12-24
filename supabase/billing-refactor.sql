
-- Create Document Type Enum
DO $$ BEGIN
    CREATE TYPE public.document_type AS ENUM ('CUENTA_DE_COBRO', 'FACTURA_ELECTRONICA', 'COTIZACION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add document_type column to invoices table
DO $$ BEGIN
    ALTER TABLE public.invoices 
    ADD COLUMN IF NOT EXISTS document_type public.document_type DEFAULT 'CUENTA_DE_COBRO';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Update existing records to ensure they have the default
UPDATE public.invoices 
SET document_type = 'CUENTA_DE_COBRO' 
WHERE document_type IS NULL;
