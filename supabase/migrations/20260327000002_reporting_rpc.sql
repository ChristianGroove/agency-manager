-- Migration: CRM Advanced Reporting RPC
-- Description: Aggregate metrics for the Command Center dashboard.
-- Date: 2026-03-27

CREATE OR REPLACE FUNCTION public.get_advanced_crm_reports(
    p_org_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    -- 1. General Metrics (FILTERED BY PERIOD)
    
    -- "Total Leads" is now "New Leads" in period for accuracy
    SELECT COUNT(*), COALESCE(SUM(value), 0)
    INTO v_new_leads, v_pipeline_value
    FROM public.leads
    WHERE organization_id = p_org_id
      AND created_at BETWEEN p_start_date AND p_end_date;

    -- Cumulative Total Leads (for conversion baseline)
    SELECT COUNT(*) INTO v_total_leads FROM public.leads WHERE organization_id = p_org_id;

    -- Won leads (within period)
    SELECT COUNT(*)
    INTO v_won_leads
    FROM public.leads
    WHERE organization_id = p_org_id
      AND status = 'won'
      AND updated_at BETWEEN p_start_date AND p_end_date;

    -- Abandoned leads (no human message in 24h, still open as of "Now")
    -- We keep this as current situation for Command Center
    SELECT COUNT(DISTINCT c.id)
    INTO v_abandoned_leads
    FROM public.conversations c
    WHERE c.organization_id = p_org_id
      AND c.status = 'open'
      AND (c.waiting_since < (now() - interval '24 hours') OR (c.last_message_at < (now() - interval '24 hours') AND c.metadata->>'last_message_direction' = 'inbound'));

    -- Get detailed list of abandoned leads
    SELECT jsonb_agg(abandoned_data)
    INTO v_abandoned_list
    FROM (
        SELECT 
            l.id,
            l.name,
            c.waiting_since,
            EXTRACT(EPOCH FROM (now() - c.waiting_since))::INT as waiting_seconds,
            COALESCE(p.full_name, 'Sin asignar') as assigned_agent,
            c.assigned_to as agent_id
        FROM public.conversations c
        JOIN public.leads l ON c.lead_id = l.id
        LEFT JOIN public.profiles p ON c.assigned_to = p.id
        WHERE c.organization_id = p_org_id
          AND c.status = 'open'
          AND (c.waiting_since < (now() - interval '24 hours') OR (c.last_message_at < (now() - interval '24 hours') AND c.metadata->>'last_message_direction' = 'inbound'))
        ORDER BY c.waiting_since ASC
        LIMIT 15
    ) abandoned_data;

    -- 2. Average Response Times (Filtered by period)
    SELECT 
        AVG(average_response_time_seconds)::INT
    INTO v_avg_response
    FROM public.conversations
    WHERE organization_id = p_org_id
      AND average_response_time_seconds > 0
      AND updated_at BETWEEN p_start_date AND p_end_date;

    -- 3. Lead Sources Distribution (Filtered by period)
    SELECT jsonb_agg(source_data)
    INTO v_lead_sources
    FROM (
        SELECT source, COUNT(*) as count
        FROM public.leads
        WHERE organization_id = p_org_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY source
        ORDER BY count DESC
    ) source_data;

    -- 4. Agent Performance (Robust Join with availability and status)
    SELECT jsonb_agg(perf)
    INTO v_agent_performance
    FROM (
        WITH 
        t_stats AS (
            SELECT 
                assigned_to, 
                COUNT(*) as leads_count,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count,
                AVG(CASE WHEN average_response_time_seconds > 0 THEN average_response_time_seconds ELSE NULL END)::INT as avg_resp,
                -- SLA Insight: Responses < 5 minutes (300s)
                SUM(CASE WHEN average_response_time_seconds > 0 AND average_response_time_seconds <= 300 THEN 1 ELSE 0 END) as fast_responses_count,
                COUNT(CASE WHEN average_response_time_seconds > 0 THEN 1 ELSE NULL END) as total_responded
            FROM public.conversations
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
              AND started_at BETWEEN p_start_date AND p_end_date
            GROUP BY agent_id
        )
        SELECT 
            m.user_id as agent_id,
            COALESCE(NULLIF(p.full_name, ''), 'Agente') as agent_name,
            p.avatar_url as avatar_url,
            COALESCE(ts.leads_count, 0) as leads_assigned,
            COALESCE(ts.won_count, 0) as deals_won,
            COALESCE(ts.avg_resp, 0) as avg_response_time,
            COALESCE(tc.connected_seconds, 0) as connection_time_seconds,
            COALESCE(aa.status, 'offline') as agent_status,
            -- Calculate SLA Ratio: (%) of conversations meeting < 5s
            CASE 
                WHEN COALESCE(ts.total_responded, 0) > 0 
                THEN ROUND((ts.fast_responses_count::numeric / ts.total_responded::numeric) * 100) 
                ELSE 0 
            END as sla_met_percentage
        FROM public.organization_members m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN t_stats ts ON m.user_id = ts.assigned_to
        LEFT JOIN t_connection tc ON m.user_id = tc.agent_id
        LEFT JOIN public.agent_availability aa ON m.user_id = aa.agent_id AND m.organization_id = aa.organization_id
        WHERE m.organization_id = p_org_id
        ORDER BY leads_assigned DESC
    ) perf;

    -- 5. Daily Activity History
    SELECT jsonb_agg(hist)
    INTO v_history
    FROM (
        SELECT 
            d::date as date,
            (SELECT COUNT(*) FROM public.leads WHERE organization_id = p_org_id AND created_at::date = d::date) as new_leads,
            -- REAL: Count outbound messages from messages table
            (SELECT COUNT(*) FROM public.messages m 
             JOIN public.conversations c ON m.conversation_id = c.id 
             WHERE c.organization_id = p_org_id 
               AND m.direction = 'outbound' 
               AND m.created_at::date = d::date) as messages_sent
        FROM generate_series(p_start_date::date, p_end_date::date, '1 day'::interval) d
    ) hist;

    RETURN jsonb_build_object(
        'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
        'debug_org_id', p_org_id,
        'summary', jsonb_build_object(
            'total_leads', v_new_leads, -- Show new leads as primary metric
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

GRANT EXECUTE ON FUNCTION public.get_advanced_crm_reports(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_advanced_crm_reports(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
