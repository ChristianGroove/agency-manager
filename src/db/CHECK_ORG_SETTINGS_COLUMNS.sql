-- ================================================================
-- DIAGNOSTIC: Check organization_settings columns
-- ================================================================

-- 1. Check what columns exist in organization_settings
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_settings'
ORDER BY ordinal_position;

-- 2. Check if wompi columns already exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'organization_settings'
AND column_name LIKE '%wompi%';
