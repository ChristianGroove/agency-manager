-- Activar módulo de limpieza para la organización 'cleaning-test' (o cambiar por el slug deseado)
DO $$
DECLARE
    target_org_id UUID;
BEGIN
    -- Intentar buscar por slug 'cleaning-test' (AJUSTAR ESTE VALOR)
    SELECT id INTO target_org_id FROM organizations WHERE slug = 'cleaning-test';

    -- Si no encuentra por slug, intentar con un fallback (ej. la primera org encontrada del usuario actual si se corriera en contexto auth, pero aquí es manual)
    -- Si target_org_id es NULL, no hará nada.
    
    IF target_org_id IS NOT NULL THEN
        INSERT INTO organization_modules (organization_id, module_key)
        VALUES (target_org_id, 'module_cleaning')
        ON CONFLICT (organization_id, module_key) DO NOTHING;
        
        RAISE NOTICE 'Módulo cleaning activado para la org: %', target_org_id;
    ELSE
        RAISE NOTICE 'No se encontró la organización con slug cleaning-test. Por favor ajuste el script.';
    END IF;
END $$;
