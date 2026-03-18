-- Fix Persistent Bubbles: Reset unread_count on agent response
-- Date: 2026-03-17

-- 1. Actualizamos el trigger para resetear unread_count cuando el agente responde
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
DECLARE
    msg_text TEXT;
    msg_type TEXT;
BEGIN
    -- Manejo seguro si content no es un objeto (Evita error 'cannot extract element from a scalar')
    IF jsonb_typeof(new.content) = 'object' THEN
        msg_type := new.content->>'type';
        msg_text := new.content->>'text';
    ELSE
        msg_type := 'text';
        msg_text := new.content#>>'{}'; -- Convierte scalar a texto de forma limpia
    END IF;

    -- Previews para multimedia
    IF msg_text IS NULL OR msg_text = '' THEN
        IF msg_type = 'image' THEN msg_text := '📷 Imagen';
        ELSIF msg_type = 'video' THEN msg_text := '🎥 Video';
        ELSIF msg_type = 'audio' THEN msg_text := '🎤 Audio';
        ELSIF msg_type = 'document' THEN msg_text := '📄 Documento';
        ELSE msg_text := 'Nuevo mensaje';
        END IF;
    END IF;

    UPDATE public.conversations
    SET 
        last_message = LEFT(msg_text, 255),
        last_message_at = new.created_at,
        updated_at = NOW(),
        -- RESET: Si es outbound (agente), volvemos a 0. Si es inbound, sumamos.
        unread_count = CASE 
            WHEN new.direction = 'inbound' THEN COALESCE(unread_count, 0) + 1 
            ELSE 0 
        END,
        -- Guardamos la dirección en el metadata para el RPC de forma segura
        metadata = jsonb_set(
            CASE WHEN jsonb_typeof(COALESCE(metadata, '{}'::jsonb)) = 'object' 
                 THEN COALESCE(metadata, '{}'::jsonb) 
                 ELSE '{}'::jsonb END, 
            '{last_message_direction}', 
            to_jsonb(new.direction)
        )
    WHERE id = new.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizamos el RPC para que las burbujas sean 100% precisas
CREATE OR REPLACE FUNCTION get_agent_monitoring_stats(p_org_id UUID)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    online BOOLEAN,
    unread_count INT,
    last_interaction_at TIMESTAMPTZ,
    current_load INT,
    max_capacity INT,
    offline_hours_24h FLOAT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_unassigned_count INT := 0;
    v_unassigned_last TIMESTAMPTZ;
BEGIN
    -- 1. Contamos chats sin asignar (FAIL-SAFE: unread > 0 Y el último NO fue el agente)
    SELECT 
        COUNT(DISTINCT c.id)::INT,
        MAX(c.last_message_at)
    INTO v_unassigned_count, v_unassigned_last
    FROM public.conversations c
    WHERE c.organization_id = p_org_id
      AND c.assigned_to IS NULL
      AND c.status = 'open'
      AND (COALESCE(c.state, 'active') = 'active')
      -- Lógica Robusta: Solo es accionable si el último mensaje fue INBOUND
      AND (COALESCE(c.metadata->>'last_message_direction', '') = 'inbound');

    RETURN QUERY
    WITH 
    t_agents AS (
        SELECT 
            m.user_id as uid,
            COALESCE(NULLIF(p.full_name, ''), 'Agente ' || LEFT(m.user_id::text, 4)) as uname,
            p.avatar_url as uavatar,
            COALESCE(aa.status = 'online', false) as uonline,
            COALESCE(aa.current_load, 0) as uload,
            COALESCE(aa.max_capacity, 10) as ucapacity,
            m.role as urole
        FROM public.organization_members m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN public.agent_availability aa ON m.user_id = aa.agent_id AND m.organization_id = aa.organization_id
        WHERE m.organization_id = p_org_id
    ),
    t_assigned_unreads AS (
        SELECT 
            c.assigned_to as u_assigned,
            COUNT(DISTINCT c.id)::INT as u_count,
            MAX(c.last_message_at) as u_last
        FROM public.conversations c
        WHERE c.organization_id = p_org_id
          AND c.assigned_to IS NOT NULL
          AND c.status = 'open'
          AND (COALESCE(c.state, 'active') = 'active')
          -- Lógica Robusta: Solo es accionable si el último mensaje fue INBOUND
          AND (COALESCE(c.metadata->>'last_message_direction', '') = 'inbound')
        GROUP BY c.assigned_to
    )
    SELECT 
        ta.uid, 
        ta.uname, 
        ta.uavatar, 
        ta.uonline, 
        -- SUMA: Propios + (Si es Owner/Admin ? Sin Asignar : 0)
        (COALESCE(tau.u_count, 0) + (CASE WHEN ta.urole IN ('owner', 'admin') THEN COALESCE(v_unassigned_count, 0) ELSE 0 END))::INT, 
        -- Mayor fecha entre propio y sin asignar
        GREATEST(tau.u_last, (CASE WHEN ta.urole IN ('owner', 'admin') THEN v_unassigned_last ELSE NULL END)),
        ta.uload, 
        ta.ucapacity, 
        (CASE WHEN ta.uonline THEN 0.0 ELSE 24.0 END)::FLOAT as offline_hours
    FROM t_agents ta
    LEFT JOIN t_assigned_unreads tau ON ta.uid = tau.u_assigned
    ORDER BY ta.uonline DESC, 5 DESC, ta.uname ASC;
END;
$$;
