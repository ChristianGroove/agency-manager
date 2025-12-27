-- ================================================================
-- FIXED: Multi-Tenant Payment Gateway Migration
-- Step-by-step execution
-- ================================================================

-- STEP 1: Add wompi_public_key if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' 
        AND column_name = 'wompi_public_key'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN wompi_public_key TEXT;
    END IF;
END $$;

-- STEP 2: Add wompi_integrity_secret column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' 
        AND column_name = 'wompi_integrity_secret'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN wompi_integrity_secret TEXT;
    END IF;
END $$;

-- STEP 3: Add wompi_currency column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' 
        AND column_name = 'wompi_currency'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN wompi_currency VARCHAR(3) DEFAULT 'COP';
    END IF;
END $$;

-- STEP 4: Verify columns were created
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'organization_settings'
AND column_name LIKE '%wompi%'
ORDER BY column_name;

-- STEP 5: MIGRATION - Update Pixy Agency keys
-- ⚠️ ACTION REQUIRED: Replace placeholder values with actual keys from .env
-- 
-- FROM YOUR .ENV FILE:
-- NEXT_PUBLIC_WOMPI_PUBLIC_KEY  → wompi_public_key
-- WOMPI_INTEGRITY_SECRET        → wompi_integrity_secret
-- NEXT_PUBLIC_WOMPI_CURRENCY    → wompi_currency

-- UNCOMMENT AND UPDATE WITH REAL VALUES:
/*
UPDATE organization_settings
SET 
    wompi_public_key = 'pub_test_YOUR_REAL_PUBLIC_KEY_HERE',
    wompi_integrity_secret = 'test_integrity_YOUR_REAL_SECRET_HERE',
    wompi_currency = 'COP'
WHERE organization_id = (
    SELECT id FROM organizations 
    WHERE name = 'Pixy Agency' 
    LIMIT 1
);
*/

-- STEP 6: Verify Pixy configuration
SELECT 
    o.name as organization_name,
    os.wompi_public_key,
    CASE 
        WHEN os.wompi_integrity_secret IS NOT NULL THEN '[CONFIGURED]'
        ELSE '[NOT CONFIGURED]'
    END as integrity_secret_status,
    os.wompi_currency
FROM organization_settings os
JOIN organizations o ON os.organization_id = o.id
WHERE o.name = 'Pixy Agency';

-- STEP 7: Add security comments
COMMENT ON COLUMN organization_settings.wompi_integrity_secret IS 
'Wompi integrity secret for signature generation. Keep this value secure and never expose in client-side code.';

COMMENT ON COLUMN organization_settings.wompi_currency IS 
'Currency code for Wompi transactions (e.g., COP, USD). Defaults to COP.';
