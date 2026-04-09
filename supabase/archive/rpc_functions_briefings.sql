-- RECREAR FUNCIONES NECESARIAS PARA BRIEFINGS (WIZARD & RESPUESTAS)
-- Ejecuta este script para asegurar que la lógica de guardar/leer respuestas funcione correctamente.

-- 1. Función para obtener briefing por token (Público)
CREATE OR REPLACE FUNCTION get_briefing_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    template_id UUID,
    client_id UUID,
    status briefing_status,
    token TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    client_name TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT 
        b.id, b.template_id, b.client_id, b.status, b.token, b.metadata, b.created_at, b.updated_at,
        c.name as client_name
    FROM briefings b
    LEFT JOIN clients c ON b.client_id = c.id
    WHERE b.token = p_token;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para guardar respuestas (Wizard)
CREATE OR REPLACE FUNCTION save_briefing_response(
    p_briefing_id UUID,
    p_field_id UUID,
    p_value JSONB
)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    -- Upsert response
    INSERT INTO briefing_responses (briefing_id, field_id, value)
    VALUES (p_briefing_id, p_field_id, p_value)
    ON CONFLICT (briefing_id, field_id)
    DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = NOW();
        
    -- Update briefing status to in_progress
    UPDATE briefings 
    SET status = 'in_progress' 
    WHERE id = p_briefing_id AND status IN ('draft', 'sent');
END;
$$ LANGUAGE plpgsql;

-- 3. Función para leer respuestas (Admin/Detalle)
CREATE OR REPLACE FUNCTION get_briefing_responses(p_briefing_id UUID)
RETURNS SETOF briefing_responses
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT * FROM briefing_responses WHERE briefing_id = p_briefing_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para enviar briefing
CREATE OR REPLACE FUNCTION submit_briefing(p_briefing_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    UPDATE briefings 
    SET status = 'submitted', updated_at = NOW()
    WHERE id = p_briefing_id;
END;
$$ LANGUAGE plpgsql;

-- PERMISOS (Garantizar acceso a funciones)
GRANT EXECUTE ON FUNCTION get_briefing_by_token(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION save_briefing_response(UUID, UUID, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_briefing_responses(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION submit_briefing(UUID) TO anon, authenticated, service_role;

-- FIX RLS (Por si acaso faltan políticas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'briefing_responses' AND policyname = 'Responses are viewable by everyone via RPC'
    ) THEN
        ALTER TABLE briefing_responses ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Responses are viewable by everyone via RPC" ON briefing_responses FOR SELECT USING (true);
    END IF;
END
$$;
