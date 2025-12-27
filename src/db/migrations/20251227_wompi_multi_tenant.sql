-- ================================================================
-- CRITICAL FIX: Multi-Tenant Payment Gateway
-- Migration: Add Wompi per-organization configuration
-- ================================================================

-- 1. Add missing columns for Wompi configuration
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS wompi_integrity_secret TEXT,
ADD COLUMN IF NOT EXISTS wompi_currency VARCHAR(3) DEFAULT 'COP';

-- 2. IMPORTANT: Migrate Pixy Agency's Wompi keys from .env to database
-- ⚠️ ACTION REQUIRED: Replace placeholder values with actual keys from your .env file
-- 
-- NEXT_PUBLIC_WOMPI_PUBLIC_KEY  → wompi_public_key
-- WOMPI_INTEGRITY_SECRET        → wompi_integrity_secret
-- NEXT_PUBLIC_WOMPI_CURRENCY    → wompi_currency

-- TEMPLATE (Replace with real values):
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

-- 3. Verify migration
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
WHERE os.wompi_public_key IS NOT NULL;

-- 4. Add helpful comment
COMMENT ON COLUMN organization_settings.wompi_integrity_secret IS 
'Wompi integrity secret for signature generation. Keep this value secure and never expose in client-side code.';

COMMENT ON COLUMN organization_settings.wompi_currency IS 
'Currency code for Wompi transactions (e.g., COP, USD). Defaults to COP.';
