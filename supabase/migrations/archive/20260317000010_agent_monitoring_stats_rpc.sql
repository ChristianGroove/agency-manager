-- 1. Borramos
DROP FUNCTION IF EXISTS get_agent_monitoring_stats(UUID);

-- 2. Versión Final: Visibilidad Compartida (Owners/Admins ven chats sin asignar)
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
    -- 1. Contamos chats sin asignar (Global para la organización)
    SELECT 
        COUNT(DISTINCT c.id)::INT,
        MAX(c.last_message_at)
    INTO v_unassigned_count, v_unassigned_last
    FROM public.conversations c
    WHERE c.organization_id = p_org_id
      AND c.assigned_to IS NULL
      AND c.status = 'open'
      AND (COALESCE(c.state, 'active') = 'active')
      AND (c.unread_count > 0 OR COALESCE(c.metadata->>'direction', '') = 'inbound');

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
          AND (c.unread_count > 0 OR COALESCE(c.metadata->>'direction', '') = 'inbound')
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

GRANT EXECUTE ON FUNCTION get_agent_monitoring_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_monitoring_stats(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION get_agent_monitoring_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_monitoring_stats(UUID) TO service_role;
