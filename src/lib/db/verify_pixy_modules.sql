-- Quick verification query for Pixy Agency modules
-- Run this before deploying dynamic sidebar

SELECT 
    o.name as organization,
    sp.name as product,
    COUNT(DISTINCT sm.id) as module_count,
    ARRAY_AGG(DISTINCT sm.key ORDER BY sm.key) as modules
FROM public.organizations o
JOIN public.organization_saas_products osp ON o.id = osp.organization_id
JOIN public.saas_products sp ON osp.product_id = sp.id
JOIN public.saas_product_modules spm ON sp.id = spm.product_id
JOIN public.system_modules sm ON spm.module_id = sm.id
WHERE o.name = 'Pixy Agency'
AND osp.status = 'active'
GROUP BY o.name, sp.name;

-- Expected result: Should show ALL module keys
-- core_clients, core_settings, core_hosting, module_invoicing, 
-- module_quotes, module_briefings, module_catalog, module_payments, etc.
