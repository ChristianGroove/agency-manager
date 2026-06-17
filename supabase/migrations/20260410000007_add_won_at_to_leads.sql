-- 1. Add won_at column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS won_at TIMESTAMP WITH TIME ZONE;

-- 2. Retroactively populate won_at for existing won deals (fallback to updated_at)
UPDATE public.leads SET won_at = updated_at WHERE status = 'won' AND won_at IS NULL;

-- 3. Create Trigger Function to automatically handle won_at
CREATE OR REPLACE FUNCTION public.fn_set_won_at()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'won' THEN
            NEW.won_at = NOW();
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'won' AND OLD.status != 'won' THEN
            NEW.won_at = NOW();
        ELSIF NEW.status != 'won' AND OLD.status = 'won' THEN
            NEW.won_at = NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach Triggers
DROP TRIGGER IF EXISTS tr_set_won_at_update ON public.leads;
CREATE TRIGGER tr_set_won_at_update
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_won_at();

DROP TRIGGER IF EXISTS tr_set_won_at_insert ON public.leads;
CREATE TRIGGER tr_set_won_at_insert
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_won_at();

-- 5. Update RPC to use won_at for historical accuracy
CREATE OR REPLACE FUNCTION public.get_advanced_crm_reports(p_org_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_total_leads INT;
    v_new_leads INT;
    v_won_leads INT;
    v_abandoned_leads INT;
    v_avg_response INT;
    v_pipeline_value DECIMAL(12,2);
    v_agent_performance JSONB;
    v_lead_sources JSONB;
    v_history JSONB;
    v_abandoned_list JSONB;
BEGIN
    -- 📉 1. General Metrics (FILTERED BY PERIOD)
    SELECT 
        COUNT(*), 
        COALESCE(SUM(value), 0)
    INTO v_new_leads, v_pipeline_value
    FROM public.leads
    WHERE organization_id = p_org_id
      AND created_at BETWEEN p_start_date AND p_end_date
      AND deleted_at IS NULL;

    -- Baseline for conversion relative to total org volume
    SELECT COUNT(*) INTO v_total_leads FROM public.leads WHERE organization_id = p_org_id AND deleted_at IS NULL;

    -- Won deals in period (Strictly using won_at)
    SELECT COUNT(*) INTO v_won_leads
    FROM public.leads
    WHERE organization_id = p_org_id
      AND status = 'won'
      AND won_at BETWEEN p_start_date AND p_end_date
      AND deleted_at IS NULL;

    -- ⏳ 2. Abandoned Leads (Optimized with composite index)
    SELECT 
        COUNT(DISTINCT c.id)
    INTO v_abandoned_leads
    FROM public.conversations c
    WHERE c.organization_id = p_org_id
      AND c.status = 'open'
      AND (c.waiting_since < (now() - interval '24 hours') OR (c.last_message_at < (now() - interval '24 hours') AND c.metadata->>'last_message_direction' = 'inbound'));

    SELECT jsonb_agg(abandoned_data)
    INTO v_abandoned_list
    FROM (
        SELECT
            l.id, l.name, c.waiting_since,
            EXTRACT(EPOCH FROM (now() - c.waiting_since))::INT as waiting_seconds,
            COALESCE(p.full_name, 'Sin asignar') as assigned_agent
        FROM public.conversations c
        JOIN public.leads l ON c.lead_id = l.id
        LEFT JOIN public.profiles p ON c.assigned_to = p.id
        WHERE c.organization_id = p_org_id
          AND c.status = 'open'
          AND (c.waiting_since < (now() - interval '24 hours') OR (c.last_message_at < (now() - interval '24 hours') AND c.metadata->>'last_message_direction' = 'inbound'))
        ORDER BY c.waiting_since ASC
        LIMIT 15
    ) abandoned_data;

    -- ⚡ 3. Avg Response & Performance
    SELECT AVG(average_response_time_seconds)::INT
    INTO v_avg_response
    FROM public.conversations
    WHERE organization_id = p_org_id
      AND average_response_time_seconds > 0
      AND updated_at BETWEEN p_start_date AND p_end_date;

    SELECT jsonb_agg(perf)
    INTO v_agent_performance
    FROM (
        WITH l_stats AS (
            SELECT
                assigned_to,
                COUNT(CASE WHEN created_at BETWEEN p_start_date AND p_end_date THEN 1 ELSE NULL END) as leads_assigned,
                SUM(CASE WHEN status = 'won' AND won_at BETWEEN p_start_date AND p_end_date THEN 1 ELSE 0 END) as won_count
            FROM public.leads
            WHERE organization_id = p_org_id
              AND deleted_at IS NULL
              AND (updated_at BETWEEN p_start_date AND p_end_date OR created_at BETWEEN p_start_date AND p_end_date OR won_at BETWEEN p_start_date AND p_end_date)
            GROUP BY assigned_to
        ),
        c_stats AS (
            SELECT
                assigned_to,
                AVG(CASE WHEN average_response_time_seconds > 0 THEN average_response_time_seconds ELSE NULL END)::INT as avg_resp,
                SUM(CASE WHEN average_response_time_seconds > 0 AND average_response_time_seconds <= 300 THEN 1 ELSE 0 END) as fast_responses_count,
                COUNT(CASE WHEN average_response_time_seconds > 0 THEN 1 ELSE NULL END) as total_responded,
                SUM(
                    CASE 
                        WHEN c.last_message_at BETWEEN p_start_date AND p_end_date THEN 1 
                        ELSE 0 
                    END
                ) as active_chats_in_period
            FROM public.conversations c
            WHERE organization_id = p_org_id
              AND updated_at BETWEEN p_start_date AND p_end_date
            GROUP BY assigned_to
        ),
        t_connection AS (
            SELECT
                agent_id,
                SUM(
                    EXTRACT(EPOCH FROM (
                        LEAST(COALESCE(ended_at, now()), p_end_date) - 
                        GREATEST(started_at, p_start_date)
                    ))
                )::INT as connected_seconds
            FROM public.agent_status_history
            WHERE organization_id = p_org_id
              AND status != 'offline'
              AND started_at <= p_end_date
              AND COALESCE(ended_at, now()) >= p_start_date
            GROUP BY agent_id
        )
        SELECT
            m.user_id as agent_id,
            COALESCE(NULLIF(p.full_name, ''), 'Agente') as agent_name,
            p.avatar_url as avatar_url,
            COALESCE(ls.leads_assigned, 0) as leads_assigned,
            COALESCE(ls.won_count, 0) as deals_won,
            COALESCE(cs.avg_resp, 0) as avg_response_time,
            COALESCE(tc.connected_seconds, 0) as connection_time_seconds,
            COALESCE(aa.status, 'offline') as agent_status,
            CASE
                WHEN COALESCE(cs.total_responded, 0) > 0
                THEN ROUND((cs.fast_responses_count::numeric / cs.total_responded::numeric) * 100)
                ELSE 0
            END as sla_met_percentage
        FROM public.organization_members m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN l_stats ls ON m.user_id = ls.assigned_to
        LEFT JOIN c_stats cs ON m.user_id = cs.assigned_to
        LEFT JOIN t_connection tc ON m.user_id = tc.agent_id
        LEFT JOIN public.agent_availability aa ON m.user_id = aa.agent_id AND m.organization_id = aa.organization_id
        WHERE m.organization_id = p_org_id
        ORDER BY deals_won DESC, leads_assigned DESC
    ) perf;

    -- 📈 4. Source Distribution
    SELECT jsonb_agg(source_data)
    INTO v_lead_sources
    FROM (
        SELECT source, COUNT(*) as count
        FROM public.leads
        WHERE organization_id = p_org_id
          AND created_at BETWEEN p_start_date AND p_end_date
          AND deleted_at IS NULL
        GROUP BY source
        ORDER BY count DESC
    ) source_data;

    -- 🕒 5. Daily Activity (Trend)
    SELECT jsonb_agg(hist)
    INTO v_history
    FROM (
        SELECT
            d::date as date,
            (SELECT COUNT(*) FROM public.leads WHERE organization_id = p_org_id AND created_at::date = d::date AND deleted_at IS NULL) as new_leads,
            (SELECT COUNT(*) FROM public.messages m
             JOIN public.conversations c ON m.conversation_id = c.id
             WHERE c.organization_id = p_org_id
               AND m.direction = 'outbound'
               AND m.created_at::date = d::date) as messages_sent
        FROM generate_series(p_start_date::date, p_end_date::date, '1 day'::interval) d
    ) hist;

    RETURN jsonb_build_object(
        'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
        'summary', jsonb_build_object(
            'total_leads', v_new_leads,
            'won_leads', v_won_leads,
            'abandoned_leads', v_abandoned_leads,
            'avg_response_time', COALESCE(v_avg_response, 0),
            'pipeline_value', v_pipeline_value,
            'conversion_rate', CASE WHEN v_new_leads > 0 THEN ROUND((v_won_leads::numeric / v_new_leads::numeric) * 100) ELSE 0 END
        ),
        'agent_performance', COALESCE(v_agent_performance, '[]'::jsonb),
        'lead_sources', COALESCE(v_lead_sources, '[]'::jsonb),
        'activity_trend', COALESCE(v_history, '[]'::jsonb),
        'abandoned_leads_list', COALESCE(v_abandoned_list, '[]'::jsonb)
    );
END;
$$;
