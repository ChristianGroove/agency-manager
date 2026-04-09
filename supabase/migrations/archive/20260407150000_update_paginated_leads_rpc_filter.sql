-- ============================================
-- CRM: Paginated Leads RPC (v6.1: Restore Manual Leads & Pipeline Inclusivity)
-- Date: 2026-04-07
-- Description: Fixes regression where manual leads were hidden.
--              Expands 'lead' filter to include 'prospect' for Pipeline.
-- ============================================

CREATE OR REPLACE FUNCTION public.get_paginated_leads(
  p_org_id UUID,
  p_search TEXT DEFAULT '',
  p_stage_id TEXT DEFAULT 'all',
  p_connection_ids UUID[] DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_contact_type TEXT DEFAULT NULL 
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INT;
  v_total_count INT;
  v_leads JSONB;
  v_stage_counts JSONB;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  -- 1. Total Count
  SELECT count(*)
  INTO v_total_count
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
    AND (p_date_to IS NULL OR created_at <= p_date_to);

  -- 2. Fetch Leads
  SELECT jsonb_agg(res)
  INTO v_leads
  FROM (
      SELECT *
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
      ORDER BY created_at DESC
      LIMIT p_page_size
      OFFSET v_offset
  ) res;

  -- 3. Stage counts
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
    'leads', COALESCE(v_leads, '[]'::jsonb),
    'totalCount', v_total_count,
    'stageCounts', COALESCE(v_stage_counts, '{}'::jsonb)
  );
END;
$$;
