-- Diagnose missing modules for Pixy Agency

-- 1. Check ALL system modules that exist
SELECT key, name, category FROM system_modules ORDER BY key;

-- 2. Check what modules Pixy currently has
SELECT sm.key, sm.name
FROM system_modules sm
JOIN saas_product_modules spm ON sm.id = spm.module_id
JOIN saas_products sp ON spm.product_id = sp.id
JOIN organization_saas_products osp ON sp.id = osp.product_id
JOIN organizations o ON osp.organization_id = o.id
WHERE o.name = 'Pixy Agency'
AND osp.status = 'active'
ORDER BY sm.key;

-- 3. Check module mapping from module-config.ts
-- Expected modules:
-- dashboard (no module required)
-- core_clients → Clientes ✓
-- core_hosting → Contratos ✗ MISSING
-- module_invoicing → Documentos de Cobro ✓
-- module_quotes → Cotizaciones ✗ MISSING
-- module_briefings → Briefings ✓
-- module_catalog → Catálogo ✓
-- module_payments → Pagos ✗ MISSING
-- core_settings → Configuración ✓
