
-- Add vault_config to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS vault_config jsonb DEFAULT '{"enabled": false, "frequency": "weekly"}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.organizations.vault_config IS 'Configuration for automated Data Vault backups (enabled, frequency, last_run, etc.)';
