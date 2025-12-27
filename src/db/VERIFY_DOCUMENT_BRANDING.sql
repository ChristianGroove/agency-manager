-- Quick verification of document branding setup

-- 1. Check column structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organization_settings'
AND column_name LIKE 'document_%'
ORDER BY column_name;

-- 2. Check Pixy Agency branding settings
SELECT 
    o.name,
    os.document_primary_color,
    os.document_secondary_color,
    os.document_logo_url,
    os.document_logo_size,
    os.document_template_style,
    os.document_show_watermark
FROM organization_settings os
JOIN organizations o ON os.organization_id = o.id
WHERE o.name = 'Pixy Agency';

-- 3. Count organizations with custom branding
SELECT 
    COUNT(*) FILTER (WHERE document_primary_color != '#6D28D9') as custom_color_count,
    COUNT(*) as total_orgs
FROM organization_settings;
