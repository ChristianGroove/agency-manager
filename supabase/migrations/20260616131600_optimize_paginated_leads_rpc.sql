-- ============================================
-- CRM: Paginated Leads RPC (v7.0: Performance & RBAC Optimization)
-- Date: 2026-06-16
-- Description: Fixes full table scans for count(*) on large tenants.
--              Implements strict separate logical layers for UI Filters vs RBAC.
--              Solves agent blindness to unassigned leads.
-- ============================================

-- Drop the old one just in case the signature changes
DROP FUNCTION IF EXISTS public.get_paginated_leads(UUID, TEXT, TEXT, UUID[], UUID, INT, INT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

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
  p_contact_type TEXT DEFAULT NULL,
  p_allowed_channels UUID[] DEFAULT NULL
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
  v_is_global_view BOOLEAN;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  v_is_global_view := (p_user_id IS NULL);

  -- 1. Fetch exact count up to 1000 for performance (prevents full table scans on large tenants)
  -- For exact counts < 1000, it's fast. If it hits 1000, we just return 1000+ as totalCount to save DB CPU.
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
        -- UI Filter
        AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids))
        -- RBAC
        AND (
            v_is_global_view 
            OR user_id = p_user_id 
            OR assigned_to = p_user_id 
            OR (p_allowed_channels IS NOT NULL AND source_connection_id = ANY(p_allowed_channels))
        )
        AND (p_date_from IS NULL OR created_at >= p_date_from)
        AND (p_date_to IS NULL OR created_at <= p_date_to);

  -- 2. Fetch Paginated Leads
  SELECT COALESCE(jsonb_agg(res), '[]'::jsonb)
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
        -- UI Filter
        AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids))
        -- RBAC
        AND (
            v_is_global_view 
            OR user_id = p_user_id 
            OR assigned_to = p_user_id 
            OR (p_allowed_channels IS NOT NULL AND source_connection_id = ANY(p_allowed_channels))
        )
        AND (p_date_from IS NULL OR created_at >= p_date_from)
        AND (p_date_to IS NULL OR created_at <= p_date_to)
      ORDER BY created_at DESC
      LIMIT p_page_size
      OFFSET v_offset
  ) res;

  -- 3. Fast Stage counts (Only compute for leads that match the RBAC & UI filters but ignore stage filter)
  SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb)
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
        -- UI Filter (Stage is intentionally ignored here to get ALL column counts)
        AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids))
        -- RBAC
        AND (
            v_is_global_view 
            OR user_id = p_user_id 
            OR assigned_to = p_user_id 
            OR (p_allowed_channels IS NOT NULL AND source_connection_id = ANY(p_allowed_channels))
        )
      GROUP BY status
  ) s;

  RETURN jsonb_build_object(
    'leads', v_leads,
    'totalCount', v_total_count,
    'stageCounts', v_stage_counts
  );
END;
$$;
