/* ================================================================
   INVESTIGATE: Briefing Templates Schema & Access
   ================================================================ */

/* Check briefing_templates table structure */
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'briefing_templates'
ORDER BY ordinal_position;

/* Check if organization_id exists */
SELECT 
    COUNT(*) as total_templates,
    COUNT(DISTINCT organization_id) as distinct_orgs
FROM briefing_templates;

/* Check who owns templates */
SELECT 
    bt.id,
    bt.name,
    bt.slug,
    o.name as org_name
FROM briefing_templates bt
LEFT JOIN organizations o ON bt.organization_id = o.id
LIMIT 20;
