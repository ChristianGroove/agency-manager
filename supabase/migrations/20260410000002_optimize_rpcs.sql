-- 🏎️ 20260410000002_optimize_rpcs.sql
-- Refactoring critical RPCs for Maximum Scalability

-- 1. Optimized Lead Pagination
-- Reduces table scans from 3 to 2 (1 for data+count results, 1 for global stage sums)
CREATE OR REPLACE FUNCTION public.get_paginated_leads(
    p_org_id uuid, 
    p_search text DEFAULT ''::text, 
    p_stage_id text DEFAULT 'all'::text, 
    p_connection_ids uuid[] DEFAULT NULL::uuid[], 
    p_user_id uuid DEFAULT NULL::uuid, 
    p_page integer DEFAULT 1, 
    p_page_size integer DEFAULT 50, 
    p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, 
    p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, 
    p_contact_type text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
  v_offset INT;
  v_total_count INT;
  v_leads JSONB;
  v_stage_counts JSONB;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  -- 🚀 Step 1: Optimized Fetch using a single scan with Window Functions
  -- This replaces separate COUNT and SELECT calls
  WITH filtered_leads AS (
      SELECT *, COUNT(*) OVER() as full_count
      FROM public.leads
      WHERE organization_id = p_org_id
        AND deleted_at IS NULL
        AND (
            p_contact_type IS NULL
            OR contact_type = p_contact_type
            OR (p_contact_type = 'lead' AND (contact_type = 'prospect' OR contact_type IS NULL))
        )
        AND (p_search = '' OR (
            name ILIKE '%' || p_search || '%' OR
            company_name ILIKE '%' || p_search || '%' OR
            email ILIKE '%' || p_search || '%' OR
            phone ILIKE '%' || p_search || '%'
        ))
        AND (p_stage_id = 'all' OR status = p_stage_id)
        AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids) OR source_connection_id IS NULL)
        AND (p_user_id IS NULL OR user_id = p_user_id OR assigned_to = p_user_id)
        AND (p_date_from IS NULL OR created_at >= p_date_from)
        AND (p_date_to IS NULL OR created_at <= p_date_to)
  )
  SELECT 
    COALESCE(jsonb_agg(res), '[]'::jsonb),
    COALESCE(MAX(full_count), 0)
  INTO v_leads, v_total_count
  FROM (
      SELECT * FROM filtered_leads
      ORDER BY created_at DESC
      LIMIT p_page_size
      OFFSET v_offset
  ) res;

  -- 📊 Step 2: Global Stage counts (Independent of pagination/search)
  -- Uses a partial index if available on status
  SELECT jsonb_object_agg(status, count)
  INTO v_stage_counts
  FROM (
      SELECT status, count(*) as count
      FROM public.leads
      WHERE organization_id = p_org_id
        AND deleted_at IS NULL
        AND (
            p_contact_type IS NULL
            OR contact_type = p_contact_type
            OR (p_contact_type = 'lead' AND (contact_type = 'prospect' OR contact_type IS NULL))
        )
        AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids) OR source_connection_id IS NULL)
        AND (p_user_id IS NULL OR user_id = p_user_id OR assigned_to = p_user_id)
      GROUP BY status
  ) s;

  RETURN jsonb_build_object(
    'leads', v_leads,
    'totalCount', v_total_count,
    'stageCounts', COALESCE(v_stage_counts, '{}'::jsonb)
  );
END;
$$;

-- 2. Optimized Advanced CRM Reports
-- Leverages new composite indexes on conversations and agent status
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

    SELECT COUNT(*) INTO v_total_leads FROM public.leads WHERE organization_id = p_org_id AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_won_leads
    FROM public.leads
    WHERE organization_id = p_org_id
      AND status = 'won'
      AND updated_at BETWEEN p_start_date AND p_end_date
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
            -- 🏆 Primary source for Leads & Wins (Leads table)
            SELECT
                assigned_to,
                COUNT(*) as leads_assigned,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count
            FROM public.leads
            WHERE organization_id = p_org_id
              AND deleted_at IS NULL
              AND (updated_at BETWEEN p_start_date AND p_end_date OR created_at BETWEEN p_start_date AND p_end_date)
            GROUP BY assigned_to
        ),
        c_stats AS (
            -- ⚡ Primary source for Engagement/Response (Conversations table)
            SELECT
                assigned_to,
                AVG(CASE WHEN average_response_time_seconds > 0 THEN average_response_time_seconds ELSE NULL END)::INT as avg_resp,
                SUM(CASE WHEN average_response_time_seconds > 0 AND average_response_time_seconds <= 300 THEN 1 ELSE 0 END) as fast_responses_count,
                COUNT(CASE WHEN average_response_time_seconds > 0 THEN 1 ELSE NULL END) as total_responded
            FROM public.conversations
            WHERE organization_id = p_org_id
              AND updated_at BETWEEN p_start_date AND p_end_date
            GROUP BY assigned_to
        )
        SELECT
            m.user_id as agent_id,
            COALESCE(NULLIF(p.full_name, ''), 'Agente') as agent_name,
            p.avatar_url as avatar_url,
            COALESCE(ls.leads_assigned, 0) as leads_assigned,
            COALESCE(ls.won_count, 0) as deals_won,
            COALESCE(cs.avg_resp, 0) as avg_response_time,
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
        LEFT JOIN public.agent_availability aa ON m.user_id = aa.agent_id AND m.organization_id = aa.organization_id
        WHERE m.organization_id = p_org_id
        ORDER BY leads_assigned DESC
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

    RETURN jsonb_build_object(
        'totalLeads', v_total_leads,
        'newLeads', v_new_leads,
        'wonLeads', v_won_leads,
        'abandonedLeads', v_abandoned_leads,
        'avgResponseTime', v_avg_response,
        'pipelineValue', v_pipeline_value,
        'agentPerformance', COALESCE(v_agent_performance, '[]'::jsonb),
        'leadSources', COALESCE(v_lead_sources, '[]'::jsonb),
        'abandonedList', COALESCE(v_abandoned_list, '[]'::jsonb)
    );
END;
$$;
