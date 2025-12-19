-- Fix Services Table Schema
-- Add missing columns for the new Catalog feature

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS frequency text,
ADD COLUMN IF NOT EXISTS type text DEFAULT 'recurring';

-- Verify schema refresh might be needed in Supabase Dashboard (Reload schema cache)
NOTIFY pgrst, 'reload config';
