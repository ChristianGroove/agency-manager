-- Shared dashboard help quota. Authenticated callers cannot read or edit counters directly.
CREATE TABLE public.help_dashboard_tenant_limits (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  window_started timestamptz NOT NULL DEFAULT clock_timestamp(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count BETWEEN 0 AND 10)
);
ALTER TABLE public.help_dashboard_tenant_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.help_dashboard_tenant_limits FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.help_dashboard_tenant_limits TO service_role;

CREATE FUNCTION public.reserve_dashboard_help_request(p_org uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE quota public.help_dashboard_tenant_limits; requested_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_help_tenant(p_org)
    OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=p_org AND status::text='active') THEN
    RETURN jsonb_build_object('status','denied');
  END IF;
  INSERT INTO public.help_dashboard_tenant_limits(organization_id) VALUES(p_org) ON CONFLICT DO NOTHING;
  SELECT * INTO quota FROM public.help_dashboard_tenant_limits WHERE organization_id=p_org FOR UPDATE;
  -- Read the clock AFTER waiting for the row lock, not at transaction start.
  requested_at := clock_timestamp();
  IF quota.window_started<=requested_at-interval '1 minute' THEN
    quota.window_started := requested_at;
    quota.request_count := 0;
  END IF;
  IF quota.request_count>=10 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;
  UPDATE public.help_dashboard_tenant_limits SET window_started=quota.window_started,
    request_count=quota.request_count+1 WHERE organization_id=p_org;
  RETURN jsonb_build_object('status','allowed');
END; $$;
REVOKE ALL ON FUNCTION public.reserve_dashboard_help_request(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_dashboard_help_request(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
