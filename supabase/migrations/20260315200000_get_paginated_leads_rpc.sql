-- ============================================
-- CRM Ultra-Light: Paginated Leads RPC
-- Date: 2026-03-15
-- Description: RPC for server-side pagination, search, and filtering of leads
-- ============================================

CREATE OR REPLACE FUNCTION public.get_paginated_leads(
  p_org_id UUID,
  p_search TEXT DEFAULT '',
  p_stage_id TEXT DEFAULT 'all',
  p_connection_id UUID DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
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

  -- 1. Get total count for the filtered results
  SELECT count(*)
  INTO v_total_count
  FROM public.leads
  WHERE organization_id = p_org_id
    AND (p_search = '' OR (
        name ILIKE '%' || p_search || '%' OR
        company_name ILIKE '%' || p_search || '%' OR
        email ILIKE '%' || p_search || '%' OR
        phone ILIKE '%' || p_search || '%'
    ))
    AND (p_stage_id = 'all' OR status = p_stage_id)
    AND (p_connection_id IS NULL OR source_connection_id = p_connection_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to);

  -- 2. Get the paginated leads
  SELECT jsonb_agg(l)
  INTO v_leads
  FROM (
      SELECT *
      FROM public.leads
      WHERE organization_id = p_org_id
        AND (p_search = '' OR (
            name ILIKE '%' || p_search || '%' OR
            company_name ILIKE '%' || p_search || '%' OR
            email ILIKE '%' || p_search || '%' OR
            phone ILIKE '%' || p_search || '%'
        ))
        AND (p_stage_id = 'all' OR status = p_stage_id)
        AND (p_connection_id IS NULL OR source_connection_id = p_connection_id)
        AND (p_date_from IS NULL OR created_at >= p_date_from)
        AND (p_date_to IS NULL OR created_at <= p_date_to)
      ORDER BY created_at DESC
      LIMIT p_page_size
      OFFSET v_offset
  ) l;

  -- 3. Get counts per stage for the current search/filters
  SELECT jsonb_object_agg(status, count)
  INTO v_stage_counts
  FROM (
      SELECT status, count(*) as count
      FROM public.leads
      WHERE organization_id = p_org_id
        AND (p_search = '' OR (
            name ILIKE '%' || p_search || '%' OR
            company_name ILIKE '%' || p_search || '%' OR
            email ILIKE '%' || p_search || '%' OR
            phone ILIKE '%' || p_search || '%'
        ))
        AND (p_connection_id IS NULL OR source_connection_id = p_connection_id)
        AND (p_date_from IS NULL OR created_at >= p_date_from)
        AND (p_date_to IS NULL OR created_at <= p_date_to)
      GROUP BY status
  ) s;

  RETURN jsonb_build_object(
    'leads', COALESCE(v_leads, '[]'::jsonb),
    'totalCount', v_total_count,
    'stageCounts', COALESCE(v_stage_counts, '{}'::jsonb)
  );
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_paginated_leads TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paginated_leads TO service_role;
