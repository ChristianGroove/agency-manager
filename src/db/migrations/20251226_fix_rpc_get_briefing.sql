-- Migration: Securely define get_briefing_by_token RPC
-- This ensures the function exists and correctly returns UUIDs

DROP FUNCTION IF EXISTS get_briefing_by_token(text);

CREATE OR REPLACE FUNCTION get_briefing_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  status text,
  template_id uuid,
  client_id uuid,
  client_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_token text;
BEGIN
  -- Normalize token (trim whitespace)
  normalized_token := trim(p_token);

  RETURN QUERY
  SELECT 
    b.id,
    b.status::text,
    b.template_id,
    c.id as client_id,
    c.name as client_name,
    b.created_at,
    b.updated_at
  FROM briefings b
  JOIN clients c ON b.client_id = c.id
  WHERE 
    -- Case 1: Match UUID portal_token (cast to text)
    (c.portal_token::text = normalized_token)
    OR 
    -- Case 2: Match short token (exact match)
    (c.portal_short_token = normalized_token)
    OR
    -- Case 3: Match briefing specific token (64-char hash)
    (b.token = normalized_token);
END;
$$;
