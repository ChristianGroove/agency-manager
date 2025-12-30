-- Manual Fix: Run this in Supabase SQL Editor if migration fails
-- It adds the missing column manually

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS enable_biometric_login BOOLEAN DEFAULT false;

-- Force reloading of schema cache
NOTIFY pgrst, 'reload schema';
