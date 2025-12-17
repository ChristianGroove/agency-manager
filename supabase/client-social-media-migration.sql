-- Add social media fields to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS facebook text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS instagram text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tiktok text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website text DEFAULT '';
