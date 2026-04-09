-- Add settings column to integration_configs
ALTER TABLE integration_configs 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"show_ads": true, "show_social": true}'::JSONB;
