-- Migration: Ensure platform_settings has favicon_url
-- Date: 2025-12-30

-- 1. Add column if missing
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS favicon_url text;

-- 2. Ensure Row ID 1 exists
INSERT INTO platform_settings (id, agency_name)
VALUES (1, 'Pixy Legacy Management')
ON CONFLICT (id) DO NOTHING;
