-- Add Quantity Column to Services Table
-- Needed for hourly pricing or multiple units calculations

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS quantity numeric DEFAULT 1;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
