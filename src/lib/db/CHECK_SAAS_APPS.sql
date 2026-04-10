/* ================================================================
   INVESTIGATE: SaaS Apps Schema & Access
   ================================================================ */

/* Check saas_products table structure */
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'saas_products'
ORDER BY ordinal_position;

/* Check if there's an assignment table */
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%app%' OR table_name LIKE '%product%'
ORDER BY table_name;

/* Check who can see apps */
SELECT 
    sp.id,
    sp.name,
    sp.slug,
    sp.pricing_model,
    COUNT(*) as product_count
FROM saas_products sp
GROUP BY sp.id, sp.name, sp.slug, sp.pricing_model;
