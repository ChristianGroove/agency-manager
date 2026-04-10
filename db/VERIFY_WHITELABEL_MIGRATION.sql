-- ================================================================
-- EXECUTE & VERIFY: Premium White-Label Infrastructure
-- Run this after executing the migration
-- ================================================================

-- STEP 1: Verify all 6 columns were created successfully
SELECT 
    '✅ Column Verification' as check_name,
    column_name,
    data_type,
    column_default,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ Nullable'
        ELSE '❌ Required'
    END as nullable_status
FROM information_schema.columns
WHERE table_name = 'organization_settings'
AND column_name IN (
    'portal_favicon_url',
    'portal_login_background_url', 
    'portal_login_background_color',
    'email_footer_text',
    'show_powered_by_footer',
    'brand_font_family'
)
ORDER BY column_name;

-- Expected: 6 rows

-- ================================================================

-- STEP 2: Check current values for all organizations
SELECT 
    '📊 Current Organization Status' as check_name,
    o.name as organization,
    CASE 
        WHEN os.portal_favicon_url IS NOT NULL THEN '✅' 
        ELSE '○' 
    END as has_favicon,
    CASE 
        WHEN os.portal_login_background_url IS NOT NULL THEN '✅' 
        ELSE '○' 
    END as has_login_bg,
    os.portal_login_background_color as login_bg_color,
    os.show_powered_by_footer as powered_by,
    os.brand_font_family as font
FROM organizations o
LEFT JOIN organization_settings os ON o.id = os.organization_id
ORDER BY o.name;

-- Expected: All orgs with default values (NULL for URLs, defaults for colors/booleans)

-- ================================================================

-- STEP 3: Test UPDATE capability
-- This verifies the columns are writable
/*
UPDATE organization_settings
SET 
    portal_login_background_color = '#1F2937',
    brand_font_family = 'Roboto',
    show_powered_by_footer = false
WHERE organization_id = (
    SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1
);

SELECT 
    portal_login_background_color,
    brand_font_family,
    show_powered_by_footer
FROM organization_settings os
JOIN organizations o ON os.organization_id = o.id
WHERE o.name = 'Pixy Agency';
*/

-- ================================================================

-- FINAL STATUS REPORT
SELECT 
    '🎯 MIGRATION STATUS' as report,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM information_schema.columns
            WHERE table_name = 'organization_settings'
            AND column_name IN (
                'portal_favicon_url',
                'portal_login_background_url',
                'portal_login_background_color',
                'email_footer_text',
                'show_powered_by_footer',
                'brand_font_family'
            )
        ) = 6 THEN '✅ ALL COLUMNS CREATED'
        ELSE '❌ MISSING COLUMNS'
    END as schema_status,
    '✅ Ready for UI implementation' as next_step;

-- ================================================================
