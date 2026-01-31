-- PERMANENT FIX: Branding Duplication
-- 1. Deduplicate organization_settings (Keep latest)
DELETE FROM organization_settings a USING organization_settings b
WHERE a.organization_id = b.organization_id
  AND a.updated_at < b.updated_at;

-- 2. Add Unique Constraint safely (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_org_settings_id') THEN
        ALTER TABLE organization_settings
        ADD CONSTRAINT unique_org_settings_id UNIQUE (organization_id);
    END IF;
END $$;
