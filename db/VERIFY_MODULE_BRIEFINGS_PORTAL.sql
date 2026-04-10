-- ================================================================
-- VERIFY: module_briefings Portal Visibility
-- ================================================================

-- Check current settings
SELECT 
    key,
    has_client_portal_view,
    portal_tab_label,
    portal_icon_key
FROM system_modules
WHERE key = 'module_briefings';

-- If has_client_portal_view is false, update it:
-- UPDATE system_modules
-- SET has_client_portal_view = true,
--     portal_tab_label = 'Briefings',
--     portal_icon_key = 'FileText'
-- WHERE key = 'module_briefings';
