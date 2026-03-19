-- CLEANUP AND CONSOLIDATE TRIGGERS ON MESSAGES TABLE
-- Date: 2026-03-18

-- 1. Drop all known redundant triggers to ensure a single source of truth
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.messages;
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
DROP TRIGGER IF EXISTS on_message_upsert_sync_conversation ON public.messages;

-- 2. Update the Unified Trigger Function
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
DECLARE
    msg_text TEXT;
    msg_type TEXT;
    v_new_unread_count INT;
BEGIN
    -- Manejo seguro del contenido
    IF jsonb_typeof(new.content) = 'object' THEN
        msg_type := new.content->>'type';
        msg_text := new.content->>'text';
    ELSE
        msg_type := 'text';
        msg_text := new.content#>>'{}';
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

    -- Lógica de unread_count: Solo sumamos si es INBOUND. Si es OUTBOUND (agente), reseteamos a 0.
    IF new.direction = 'inbound' THEN
        -- Obtenemos el valor actual para evitar duplicados si la app ya lo insertó (aunque ahora lo quitaremos de la app)
        SELECT COALESCE(unread_count, 0) + 1 INTO v_new_unread_count 
        FROM public.conversations 
        WHERE id = new.conversation_id;
    ELSE
        v_new_unread_count := 0;
    END IF;

    UPDATE public.conversations
    SET 
        last_message = LEFT(msg_text, 255),
        last_message_at = new.created_at,
        updated_at = NOW(),
        unread_count = v_new_unread_count,
        -- Guardamos la dirección para el filtrado rápido del RPC
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

-- 3. Create the ONE and ONLY trigger
CREATE TRIGGER on_message_upsert_sync_conversation
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- 4. Refine RPC for Agent Monitoring (Accurate Online & Separated Unassigned)
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
    -- 1. Contamos chats sin asignar (Único punto de verdad para chats pendientes)
    SELECT 
        COUNT(DISTINCT c.id)::INT,
        MAX(c.last_message_at)
    INTO v_unassigned_count, v_unassigned_last
    FROM public.conversations c
    WHERE c.organization_id = p_org_id
      AND c.assigned_to IS NULL
      AND c.status = 'open'
      AND (COALESCE(c.state, 'active') = 'active')
      AND (COALESCE(c.metadata->>'last_message_direction', '') = 'inbound');

    -- 2. Retornamos la fila "Sin Asignar" primero si tiene chats
    IF v_unassigned_count > 0 THEN
        user_id := '00000000-0000-0000-0000-000000000000'::UUID;
        name := 'Sin asignar';
        avatar_url := NULL;
        online := true; -- Siempre visible si hay chats
        unread_count := v_unassigned_count;
        last_interaction_at := v_unassigned_last;
        current_load := v_unassigned_count;
        max_capacity := 0;
        offline_hours_24h := 0.0;
        RETURN NEXT;
    END IF;

    -- 3. Retornamos agentes reales
    RETURN QUERY
    WITH 
    t_agents AS (
        SELECT 
            m.user_id as uid,
            COALESCE(NULLIF(p.full_name, ''), 'Agente ' || LEFT(m.user_id::text, 4)) as uname,
            p.avatar_url as uavatar,
            -- GHOST DETECTION: Si no se ha visto en 10 min, está offline aunque diga online
            CASE 
                WHEN aa.status = 'online' AND (aa.last_seen_at > NOW() - INTERVAL '10 minutes') THEN true 
                ELSE false 
            END as uonline,
            COALESCE(aa.current_load, 0) as uload,
            COALESCE(aa.max_capacity, 10) as ucapacity,
            m.role as urole,
            aa.last_seen_at as ulast_seen
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
          AND (COALESCE(c.metadata->>'last_message_direction', '') = 'inbound')
        GROUP BY c.assigned_to
    )
    SELECT 
        ta.uid, 
        ta.uname, 
        ta.uavatar, 
        ta.uonline, 
        -- Solo sus propios chats asignados (QUITAMOS la suma de sin asignar para evitar desbordar al Admin)
        COALESCE(tau.u_count, 0)::INT, 
        tau.u_last,
        ta.uload, 
        ta.ucapacity, 
        (CASE WHEN ta.uonline THEN 0.0 ELSE 24.0 END)::FLOAT
    FROM t_agents ta
    LEFT JOIN t_assigned_unreads tau ON ta.uid = tau.u_assigned
    ORDER BY ta.uonline DESC, 5 DESC, ta.uname ASC;
END;
$$;
