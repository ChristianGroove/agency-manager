-- Add 'archived' field to invoices table to allow hiding archived invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
