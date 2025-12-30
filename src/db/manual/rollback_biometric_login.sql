-- ROLLBACK SCRIPT
-- Reverts the "Configurable Biometric Login" feature database change.

ALTER TABLE organization_settings 
DROP COLUMN IF EXISTS enable_biometric_login;

-- Clear schema cache
NOTIFY pgrst, 'reload schema';
