-- ============================================
-- ACTUALIZACIÓN DE ASIGNACIÓN DE APPS Y VERTICAL KEY
-- Date: 2026-03-16
-- ============================================

CREATE OR REPLACE FUNCTION public.assign_app_to_organization(
    p_organization_id UUID,
    p_app_id TEXT,
    p_enable_optional_modules BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_app RECORD;
    v_module RECORD;
    v_modules_to_enable TEXT[] := ARRAY[]::TEXT[];
    v_vertical_key TEXT;
BEGIN
    -- 1. Obtener detalles de la app
    SELECT * INTO v_app
    FROM public.saas_apps
    WHERE id = p_app_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'App not found or inactive'
        );
    END IF;
    
    -- 2. Determinar el vertical_key basado en la categoría de la app
    -- Mapeo de categorías a verticales permitidos
    v_vertical_key := CASE 
        WHEN v_app.category = 'agency' THEN 'agency'
        WHEN v_app.category = 'resto' THEN 'resto'
        WHEN v_app.category = 'cleaning' THEN 'cleaning'
        WHEN v_app.category = 'retail' THEN 'retail'
        WHEN v_app.category = 'ecommerce' THEN 'retail'
        WHEN v_app.category = 'saas' THEN 'saas'
        WHEN v_app.category = 'platform' THEN 'platform'
        ELSE 'agency' -- Fallback
    END;

    -- 3. Actualizar organización: active_app_id y vertical_key
    UPDATE public.organizations
    SET 
        active_app_id = p_app_id,
        vertical_key = v_vertical_key,
        app_activated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    -- 4. Recolectar módulos a activar
    FOR v_module IN 
        SELECT module_key, auto_enable, is_optional
        FROM public.saas_app_modules
        WHERE app_id = p_app_id
        ORDER BY sort_order
    LOOP
        -- Auto-activar si auto_enable es true o es opcional pero p_enable_optional_modules es true
        IF v_module.auto_enable OR (v_module.is_optional AND p_enable_optional_modules) THEN
            v_modules_to_enable := array_append(v_modules_to_enable, v_module.module_key);
        END IF;
    END LOOP;
    
    -- 5. Actualizar manual_module_overrides de la organización
    UPDATE public.organizations
    SET 
        manual_module_overrides = to_jsonb(v_modules_to_enable),
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'app_id', p_app_id,
        'app_name', v_app.name,
        'vertical_key', v_vertical_key,
        'modules_enabled', v_modules_to_enable
    );
END;
$$;

COMMENT ON FUNCTION public.assign_app_to_organization IS 'Asigna un template de app a una organización, habilita sus módulos y sincroniza el vertical_key';
