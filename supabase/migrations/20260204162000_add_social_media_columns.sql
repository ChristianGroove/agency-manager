-- Add social media columns to clients table
-- Migration: 20260204162000_add_social_media_columns.sql

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS tiktok TEXT,
ADD COLUMN IF NOT EXISTS youtube TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.clients.linkedin IS 'LinkedIn profile URL';
COMMENT ON COLUMN public.clients.twitter IS 'Twitter/X username or profile URL';
COMMENT ON COLUMN public.clients.tiktok IS 'TikTok username or profile URL';
COMMENT ON COLUMN public.clients.youtube IS 'YouTube channel URL';
