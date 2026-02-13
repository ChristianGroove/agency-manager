-- Add avatar_url column to leads and clients tables
ALTER TABLE leads ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url text;
