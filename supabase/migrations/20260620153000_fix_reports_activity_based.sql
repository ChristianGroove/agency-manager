-- 🔧 20260620153000_fix_reports_activity_based.sql
-- CRITICAL FIX: Reports now count leads with ACTIVITY in the period,
-- not just leads CREATED in the period.
--
-- Problem: The system reuses existing leads when the same phone number
-- sends a new message. Their created_at stays as the original date (e.g. March/April).
-- The old RPC filtered by created_at BETWEEN, so leads that were active
-- in June but created in April were invisible to the report.
--
-- Solution: Count leads that had conversations with messages in the period,
-- OR were created in the period (truly new leads).

CREATE OR REPLACE FUNCTION public.get_advanced_crm_reports(p_org_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_total_leads INT;
    v_new_leads INT;
    v_active_leads INT;
    v_won_leads INT;
    v_abandoned_leads INT;
    v_avg_response INT;
    v_pipeline_value DECIMAL(12,2);
    v_agent_performance JSONB;
    v_lead_sources JSONB;
    v_history JSONB;
    v_abandoned_list JSONB;
BEGIN
    -- 📊 1. ACTIVE Leads in Period
    -- A lead is "active" if it had any conversation with messages in the period,
    -- OR if it was newly created in the period.
    SELECT 
        COUNT(DISTINCT l.id),
        COALESCE(SUM(DISTINCT l.value), 0)
    INTO v_active_leads, v_pipeline_value
    FROM public.leads l
    WHERE l.organization_id = p_org_id
      AND l.deleted_at IS NULL
      AND (
          -- Option A: Lead was created in the period (truly new)
          l.created_at BETWEEN p_start_date AND p_end_date
          OR
          -- Option B: Lead had a conversation with messages in the period
          EXISTS (
              SELECT 1 FROM public.conversations c
              WHERE c.lead_id = l.id
                AND c.organization_id = p_org_id
                AND c.last_message_at BETWEEN p_start_date AND p_end_date
          )
      );

    -- Count truly NEW leads created in the period (for the trend chart)
    SELECT COUNT(*)
    INTO v_new_leads
    FROM public.leads
    WHERE organization_id = p_org_id
      AND created_at BETWEEN p_start_date AND p_end_date
      AND deleted_at IS NULL;

    -- Baseline for conversion relative to total org volume
    SELECT COUNT(*) INTO v_total_leads FROM public.leads WHERE organization_id = p_org_id AND deleted_at IS NULL;

    -- Won deals in period
    SELECT COUNT(*) INTO v_won_leads
    FROM public.leads
    WHERE organization_id = p_org_id
      AND status = 'won'
      AND updated_at BETWEEN p_start_date AND p_end_date
      AND deleted_at IS NULL;

    -- 🚨 2. Abandoned Leads (unchanged - not period-dependent)
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

    -- 🕐 3. Avg Response & Performance
    SELECT AVG(average_response_time_seconds)::INT
    INTO v_avg_response
    FROM public.conversations
    WHERE organization_id = p_org_id
      AND average_response_time_seconds > 0
      AND updated_at BETWEEN p_start_date AND p_end_date;

    SELECT jsonb_agg(perf)
    INTO v_agent_performance
    FROM (
        WITH active_lead_ids AS (
            -- Pre-compute the set of leads active in this period
            SELECT DISTINCT l.id as lead_id, l.assigned_to, l.status, l.value
            FROM public.leads l
            WHERE l.organization_id = p_org_id
              AND l.deleted_at IS NULL
              AND (
                  l.created_at BETWEEN p_start_date AND p_end_date
                  OR EXISTS (
                      SELECT 1 FROM public.conversations c
                      WHERE c.lead_id = l.id
                        AND c.organization_id = p_org_id
                        AND c.last_message_at BETWEEN p_start_date AND p_end_date
                  )
              )
        ),
        l_stats AS (
            SELECT
                assigned_to,
                COUNT(*) as leads_assigned,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count
            FROM active_lead_ids
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
                    CASE
                        WHEN ended_at IS NOT NULL THEN duration_seconds
                        ELSE EXTRACT(EPOCH FROM (now() - started_at))::INT
                    END
                )::INT as connected_seconds
            FROM public.agent_status_history
            WHERE organization_id = p_org_id
              AND status != 'offline'
              AND (started_at BETWEEN p_start_date AND p_end_date OR ended_at BETWEEN p_start_date AND p_end_date)
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
        ORDER BY leads_assigned DESC
    ) perf;

    -- 📈 4. Source Distribution (FIXED: include active leads, not just created)
    SELECT jsonb_agg(source_data)
    INTO v_lead_sources
    FROM (
        SELECT l.source, COUNT(*) as count
        FROM public.leads l
        WHERE l.organization_id = p_org_id
          AND l.deleted_at IS NULL
          AND (
              l.created_at BETWEEN p_start_date AND p_end_date
              OR EXISTS (
                  SELECT 1 FROM public.conversations c
                  WHERE c.lead_id = l.id
                    AND c.organization_id = p_org_id
                    AND c.last_message_at BETWEEN p_start_date AND p_end_date
              )
          )
        GROUP BY l.source
        ORDER BY count DESC
    ) source_data;

    -- 📅 5. Daily Activity (Trend) - FIXED: count leads with messages on that day
    SELECT jsonb_agg(hist)
    INTO v_history
    FROM (
        SELECT
            d::date as date,
            (
                SELECT COUNT(DISTINCT l.id)
                FROM public.leads l
                WHERE l.organization_id = p_org_id
                  AND l.deleted_at IS NULL
                  AND (
                      l.created_at::date = d::date
                      OR EXISTS (
                          SELECT 1 FROM public.conversations c
                          WHERE c.lead_id = l.id
                            AND c.organization_id = p_org_id
                            AND c.last_message_at::date = d::date
                      )
                  )
            ) as new_leads,
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
            'total_leads', v_active_leads,
            'won_leads', v_won_leads,
            'abandoned_leads', v_abandoned_leads,
            'avg_response_time', COALESCE(v_avg_response, 0),
            'pipeline_value', v_pipeline_value,
            'conversion_rate', CASE WHEN v_active_leads > 0 THEN ROUND((v_won_leads::numeric / v_active_leads::numeric) * 100) ELSE 0 END
        ),
        'agent_performance', COALESCE(v_agent_performance, '[]'::jsonb),
        'lead_sources', COALESCE(v_lead_sources, '[]'::jsonb),
        'activity_trend', COALESCE(v_history, '[]'::jsonb),
        'abandoned_leads_list', COALESCE(v_abandoned_list, '[]'::jsonb)
    );
END;
$$;
