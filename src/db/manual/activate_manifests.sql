
-- Activate 'module_manifests' for 'dannicel' (or whatever slug we find)
-- This appends to the array if not already present

UPDATE organizations
SET manual_module_overrides = 
    CASE 
        WHEN manual_module_overrides IS NULL THEN ARRAY['module_manifests']
        WHEN NOT ('module_manifests' = ANY(manual_module_overrides)) THEN array_append(manual_module_overrides, 'module_manifests')
        ELSE manual_module_overrides
    END
WHERE slug ILIKE '%dannicel%'; -- Be safer with partial match or check script output first
