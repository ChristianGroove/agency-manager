-- Add enable_biometric_login column to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS enable_biometric_login BOOLEAN DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN organization_settings.enable_biometric_login IS 'Controls whether biometric login (Passkeys) is enabled for this organization';
