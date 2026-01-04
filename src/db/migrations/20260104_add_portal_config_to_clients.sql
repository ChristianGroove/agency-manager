-- Add portal_config column to clients table
-- This column stores the client-specific portal settings (JSONB)
-- Structure:
-- {
--   "enabled": boolean,
--   "modules": {
--     "module_name": { "mode": "auto" | "on" | "off" }
--   }
-- }

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS portal_config JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN clients.portal_config IS 'Client-specific portal configuration and module visibility settings';
