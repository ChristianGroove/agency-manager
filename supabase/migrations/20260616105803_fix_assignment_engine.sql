-- Atomic Chat Assignment logic to prevent race conditions (V2)
-- Fixes: RoundRobin fair skip, Legacy Permissions, 5m Heartbeat



CREATE OR REPLACE FUNCTION public.fn_get_next_agent_atomic(
    p_org_id UUID,
    p_strategy VARCHAR,
    p_agent_pool UUID[] DEFAULT NULL,
    p_channel_type VARCHAR DEFAULT NULL,
    p_connection_id VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_agent_id UUID;
    v_last_agent_id UUID;
    v_qualified_agent_ids UUID[];
    v_last_index INT;
    v_methods VARCHAR[];
BEGIN
    -- 0. Acquire advisory lock for this organization to prevent concurrent assignments
    PERFORM pg_advisory_xact_lock(hashtext(p_org_id::text));

    -- 1. Identify "Qualified" Agents
    -- (Online, Heartbeat (5m), and Role/Channel Access + Legacy Permissions support)
    SELECT ARRAY_AGG(DISTINCT aa.agent_id ORDER BY aa.agent_id) INTO v_qualified_agent_ids
    FROM public.agent_availability aa
    JOIN public.organization_members om ON om.user_id = aa.agent_id AND om.organization_id = aa.organization_id
    LEFT JOIN public.agent_channels ac ON ac.agent_id = aa.agent_id AND ac.is_active = true
    WHERE aa.organization_id = p_org_id
      AND aa.status = 'online'
      AND aa.auto_assign_enabled = true
      AND aa.last_seen_at > (NOW() - INTERVAL '5 minutes')
      AND (p_agent_pool IS NULL OR aa.agent_id = ANY(p_agent_pool))
      AND (
          LOWER(om.role) IN ('admin', 'owner') 
          OR (p_channel_type IS NOT NULL AND (ac.channel_type = p_channel_type OR ac.channel_type = p_connection_id))
          OR (om.permissions->'inbox_access' @> jsonb_build_array(p_connection_id))
          OR (om.permissions->'modules'->'inbox'->'inbox_access' @> jsonb_build_array(p_connection_id))
          OR (om.permissions->'inbox'->'inbox_access' @> jsonb_build_array(p_connection_id))
      );

    IF v_qualified_agent_ids IS NULL OR array_length(v_qualified_agent_ids, 1) = 0 THEN
        RETURN NULL;
    END IF;

    -- 2. Select Agent based on Strategy
    IF p_strategy IN ('round-robin', 'specific-agent') THEN
        v_methods := CASE WHEN p_strategy = 'round-robin' THEN ARRAY['round-robin', 'auto-rule'] ELSE ARRAY[p_strategy] END;

        -- Get last assigned agent from history
        SELECT h.assigned_to INTO v_last_agent_id
        FROM public.assignment_history h
        JOIN public.conversations c ON c.id = h.conversation_id
        WHERE c.organization_id = p_org_id
          AND h.assignment_method = ANY(v_methods)
        ORDER BY h.created_at DESC
        LIMIT 1;

        v_last_index := array_position(v_qualified_agent_ids, v_last_agent_id);
        IF v_last_index IS NULL AND v_last_agent_id IS NOT NULL THEN
            -- If last agent went offline, find the next available agent alphabetically
            SELECT array_position(v_qualified_agent_ids, q_id) INTO v_last_index
            FROM unnest(v_qualified_agent_ids) AS q_id
            WHERE q_id > v_last_agent_id
            ORDER BY q_id ASC
            LIMIT 1;
            
            IF v_last_index IS NULL THEN
                v_agent_id := v_qualified_agent_ids[1];
            ELSE
                v_agent_id := v_qualified_agent_ids[v_last_index];
            END IF;
        ELSIF v_last_index IS NULL THEN
            v_agent_id := v_qualified_agent_ids[1];
        ELSE
            v_agent_id := v_qualified_agent_ids[(v_last_index % array_length(v_qualified_agent_ids, 1)) + 1];
        END IF;

    ELSIF p_strategy = 'load-balance' THEN
        -- Choose agent with lowest load percentage, randomized on ties
        SELECT aa.agent_id INTO v_agent_id
        FROM public.agent_availability aa
        WHERE aa.agent_id = ANY(v_qualified_agent_ids)
          AND aa.current_load < aa.max_capacity
        ORDER BY (aa.current_load::float / NULLIF(aa.max_capacity, 0)) ASC, random()
        LIMIT 1;
    ELSE
        -- Fallback to first qualified
        v_agent_id := v_qualified_agent_ids[1];
    END IF;

    RETURN v_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
