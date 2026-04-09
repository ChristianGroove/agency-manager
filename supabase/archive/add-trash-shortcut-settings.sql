-- Add trash_shortcut column to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS trash_shortcut TEXT DEFAULT 'ctrl+alt+p';
