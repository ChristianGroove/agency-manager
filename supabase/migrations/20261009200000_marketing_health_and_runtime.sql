-- Marketing-only readiness, fair claims and execution evidence. No sends or existing campaign activation.
BEGIN;
CREATE TABLE public.marketing_channel_health(
 connection_id uuid PRIMARY KEY REFERENCES public.integration_connections(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 quality text CHECK(quality IN ('GREEN','YELLOW','RED','UNKNOWN')),
 checked_at timestamptz,
 hold_code integer, held_at timestamptz, hold_until timestamptz,
 released_at timestamptz, reviewed_by uuid REFERENCES auth.users(id), last_claimed_at timestamptz, probe_claimed_until timestamptz
);
ALTER TABLE public.marketing_channel_health ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_channel_health FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.marketing_channel_health TO service_role;

CREATE FUNCTION public.marketing_channel_dispatch_open(p_org uuid,p_connection uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.marketing_channel_health h JOIN public.integration_connections c ON c.id=h.connection_id
 AND c.organization_id=h.organization_id WHERE h.connection_id=p_connection AND h.organization_id=p_org AND c.status='active'
 AND c.provider_key IN ('whatsapp_cloud','meta_whatsapp') AND h.quality IN ('GREEN','YELLOW')
 AND h.checked_at>clock_timestamp()-interval '24 hours'
 AND (h.hold_code IS NULL OR h.hold_until<=clock_timestamp()))
$$;
REVOKE ALL ON FUNCTION public.marketing_channel_dispatch_open(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_channel_dispatch_open(uuid,uuid) TO service_role;

CREATE FUNCTION public.store_marketing_channel_probe(p_org uuid,p_connection uuid,p_quality text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.integration_connections WHERE id=p_connection AND organization_id=p_org
 AND provider_key IN ('whatsapp_cloud','meta_whatsapp')) THEN RAISE EXCEPTION 'Marketing channel unavailable'; END IF;
 INSERT INTO public.marketing_channel_health(connection_id,organization_id,quality,checked_at)
 VALUES(p_connection,p_org,CASE WHEN p_quality IN ('GREEN','YELLOW','RED') THEN p_quality ELSE 'UNKNOWN' END,clock_timestamp())
 ON CONFLICT(connection_id) DO UPDATE SET quality=EXCLUDED.quality,checked_at=EXCLUDED.checked_at,probe_claimed_until=NULL;
END $$;
REVOKE ALL ON FUNCTION public.store_marketing_channel_probe(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_marketing_channel_probe(uuid,uuid,text) TO service_role;

CREATE FUNCTION public.claim_marketing_health_probes(p_limit integer DEFAULT 3)
RETURNS TABLE(connection_id uuid,organization_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 INSERT INTO public.marketing_channel_health(connection_id,organization_id)
 SELECT DISTINCT c.connection_id,c.organization_id FROM public.marketing_campaigns c
 WHERE c.status='active' AND c.execution_version=2 AND c.connection_id IS NOT NULL ON CONFLICT DO NOTHING;
 RETURN QUERY WITH due AS (SELECT h.connection_id FROM public.marketing_channel_health h
 WHERE (h.checked_at IS NULL OR h.checked_at<clock_timestamp()-CASE WHEN h.quality='UNKNOWN' THEN interval '5 minutes' ELSE interval '1 hour' END)
 AND (h.probe_claimed_until IS NULL OR h.probe_claimed_until<clock_timestamp())
 AND EXISTS(SELECT 1 FROM public.marketing_campaigns c WHERE c.connection_id=h.connection_id AND c.organization_id=h.organization_id
  AND c.status='active' AND c.execution_version=2)
 ORDER BY h.checked_at NULLS FIRST,h.connection_id LIMIT greatest(1,least(p_limit,3)) FOR UPDATE OF h SKIP LOCKED)
 UPDATE public.marketing_channel_health h SET probe_claimed_until=clock_timestamp()+interval '60 seconds'
 FROM due WHERE h.connection_id=due.connection_id RETURNING h.connection_id,h.organization_id;
END $$;
REVOKE ALL ON FUNCTION public.claim_marketing_health_probes(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketing_health_probes(integer) TO service_role;

CREATE FUNCTION public.hold_marketing_channel(p_org uuid,p_connection uuid,p_code integer,p_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 -- Local conservative policy: these account/authentication/number errors require review.
 -- Throughput causes a cooldown; recipient and template errors do not block all campaigns.
 IF p_code NOT IN (10,190,200,130429,131005,131031,131042,131048,133010) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.integration_connections WHERE id=p_connection AND organization_id=p_org) THEN RETURN; END IF;
 INSERT INTO public.marketing_channel_health(connection_id,organization_id,hold_code,held_at,hold_until)
 VALUES(p_connection,p_org,p_code,least(p_at,clock_timestamp()),CASE WHEN p_code=130429 THEN clock_timestamp()+interval '15 minutes' END)
 ON CONFLICT(connection_id) DO UPDATE SET hold_code=EXCLUDED.hold_code,held_at=EXCLUDED.held_at,hold_until=EXCLUDED.hold_until
 WHERE EXCLUDED.held_at>greatest(coalesce(marketing_channel_health.held_at,'-infinity'),coalesce(marketing_channel_health.released_at,'-infinity'))
 -- A later cooldown must never weaken an unresolved hold requiring review.
 AND (marketing_channel_health.hold_code IS NULL OR marketing_channel_health.hold_until IS NOT NULL OR EXCLUDED.hold_until IS NULL);
END $$;
REVOKE ALL ON FUNCTION public.hold_marketing_channel(uuid,uuid,integer,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hold_marketing_channel(uuid,uuid,integer,timestamptz) TO service_role;

CREATE FUNCTION public.marketing_rejection_observer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE operation record; item jsonb; errors jsonb; event_at timestamptz;
BEGIN
 IF TG_TABLE_NAME='meta_outbound_outbox' THEN
  IF NEW.status='failed' AND NEW.operation_key LIKE 'campaign:%' AND NEW.error_kind ~ '^meta_[0-9]{1,9}$' THEN
   PERFORM public.hold_marketing_channel(NEW.organization_id,NEW.connection_id,substring(NEW.error_kind FROM 6)::integer,clock_timestamp());
  ELSIF NEW.status='accepted' AND NEW.external_id IS NOT NULL THEN
   -- A failure receipt can precede the local Graph acknowledgement.
   SELECT error_codes,event_timestamp INTO errors,event_at FROM public.meta_message_statuses
   WHERE organization_id=NEW.organization_id AND connection_id=NEW.connection_id AND external_id=NEW.external_id AND status='failed';
  END IF;
 ELSE
  IF NEW.status='failed' AND jsonb_typeof(NEW.error_codes)='array' THEN
   SELECT o.id INTO operation FROM public.meta_outbound_outbox o WHERE o.organization_id=NEW.organization_id
    AND o.connection_id=NEW.connection_id AND o.external_id=NEW.external_id AND o.operation_key LIKE 'campaign:%' LIMIT 1;
   IF operation.id IS NOT NULL THEN errors:=NEW.error_codes; event_at:=NEW.event_timestamp; END IF;
  END IF;
 END IF;
 IF jsonb_typeof(errors)='array' THEN
  FOR item IN SELECT * FROM jsonb_array_elements(errors) LOOP
   IF item->>'code' ~ '^[0-9]{1,9}$' THEN
    PERFORM public.hold_marketing_channel(NEW.organization_id,NEW.connection_id,(item->>'code')::integer,event_at);
   END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.marketing_rejection_observer() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER marketing_rejection_outbox AFTER UPDATE OF status,error_kind,external_id ON public.meta_outbound_outbox
 FOR EACH ROW WHEN(NEW.status IN ('failed','accepted') AND NEW.operation_key LIKE 'campaign:%') EXECUTE FUNCTION public.marketing_rejection_observer();
CREATE TRIGGER marketing_rejection_receipt AFTER INSERT OR UPDATE ON public.meta_message_statuses
 FOR EACH ROW WHEN(NEW.status='failed') EXECUTE FUNCTION public.marketing_rejection_observer();

CREATE FUNCTION public.acknowledge_marketing_channel_hold(p_org uuid,p_connection uuid,p_actor uuid,p_expected_hold timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.organization_members m LEFT JOIN public.organization_roles r ON r.id=m.role_id AND r.organization_id=m.organization_id
 WHERE m.organization_id=p_org AND m.user_id=p_actor AND m.deleted_at IS NULL AND coalesce(m.status,'active')='active' AND CASE
 WHEN m.permissions ? 'marketing.campaigns.execute' THEN m.permissions->>'marketing.campaigns.execute'='true'
 WHEN r.permissions ? 'marketing.campaigns.execute' THEN r.permissions->>'marketing.campaigns.execute'='true'
 ELSE m.role IN ('owner','admin') OR r.hierarchy_level=100 OR r.permissions->>'all'='true' OR m.permissions->>'all'='true' END)
 THEN RAISE EXCEPTION 'Marketing execution denied'; END IF;
 UPDATE public.marketing_channel_health SET hold_code=NULL,hold_until=NULL,released_at=clock_timestamp(),reviewed_by=p_actor
 WHERE organization_id=p_org AND connection_id=p_connection AND held_at=p_expected_hold
 AND quality IN ('GREEN','YELLOW') AND checked_at>clock_timestamp()-interval '30 minutes';
 IF NOT FOUND THEN RAISE EXCEPTION 'Refresh channel and review the latest hold'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.acknowledge_marketing_channel_hold(uuid,uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_marketing_channel_hold(uuid,uuid,uuid,timestamptz) TO service_role;

CREATE FUNCTION public.read_marketing_channel_health(p_org uuid,p_connection uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('ready',public.marketing_channel_dispatch_open(p_org,p_connection),'quality',h.quality,
 'checkedAt',h.checked_at,'holdCode',h.hold_code,'holdAt',h.held_at,'holdUntil',h.hold_until)
 FROM (SELECT 1) seed LEFT JOIN public.marketing_channel_health h ON h.connection_id=p_connection AND h.organization_id=p_org
$$;
REVOKE ALL ON FUNCTION public.read_marketing_channel_health(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_marketing_channel_health(uuid,uuid) TO service_role;

ALTER FUNCTION public.read_marketing_preflight(uuid,uuid) RENAME TO read_marketing_preflight_before_health;
REVOKE ALL ON FUNCTION public.read_marketing_preflight_before_health(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.read_marketing_preflight(p_org uuid,p_campaign uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 result:=public.read_marketing_preflight_before_health(p_org,p_campaign);
 IF result->'channel' IS NOT NULL AND result->'channel'<>'null'::jsonb THEN
  result:=jsonb_set(result,'{channel,health}',public.read_marketing_channel_health(p_org,(result->'campaign'->>'connection_id')::uuid)); END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_preflight(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_preflight(uuid,uuid) TO authenticated,service_role;

ALTER FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) RENAME TO marketing_outbound_allowed_before_health;
REVOKE ALL ON FUNCTION public.marketing_outbound_allowed_before_health(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.marketing_outbound_allowed(p_org uuid,p_connection uuid,p_operation text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.marketing_channel_dispatch_open(p_org,p_connection) AND public.marketing_outbound_allowed_before_health(p_org,p_connection,p_operation)
$$;
REVOKE ALL ON FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) TO service_role;
-- Apply readiness at the SQL activation boundary as well as in the server review.
CREATE FUNCTION public.marketing_activation_health_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status='active' AND NEW.execution_version=2 AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.execution_version IS DISTINCT FROM NEW.execution_version)
 AND NOT public.marketing_channel_dispatch_open(NEW.organization_id,NEW.connection_id) THEN RAISE EXCEPTION 'Refresh and review WhatsApp channel health before activation'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.marketing_activation_health_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER marketing_activation_health BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.marketing_activation_health_guard();

CREATE OR REPLACE FUNCTION public.claim_marketing_enrollments(p_limit integer DEFAULT 25)
RETURNS SETOF public.marketing_enrollments LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH numbers AS MATERIALIZED (
 SELECT h.connection_id FROM public.marketing_channel_health h WHERE public.marketing_channel_dispatch_open(h.organization_id,h.connection_id)
 AND EXISTS(SELECT 1 FROM public.marketing_campaigns c JOIN public.marketing_enrollments e ON e.campaign_id=c.id AND e.organization_id=c.organization_id
 WHERE c.connection_id=h.connection_id AND c.organization_id=h.organization_id AND c.status='active' AND c.execution_version=2
 AND e.status='active' AND e.next_run_at<=now() AND (c.scheduled_for IS NULL OR c.scheduled_for<=now())
 AND (e.claimed_until IS NULL OR e.claimed_until<now()))
 ORDER BY h.last_claimed_at NULLS FIRST,h.connection_id LIMIT greatest(1,least(p_limit,25)) FOR UPDATE OF h SKIP LOCKED
 ), candidates AS MATERIALIZED (
 SELECT chosen.id,n.connection_id FROM numbers n CROSS JOIN LATERAL (
 SELECT e.id FROM public.marketing_enrollments e JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=e.organization_id
 WHERE c.connection_id=n.connection_id AND c.status='active' AND c.execution_version=2 AND e.status='active'
 AND e.next_run_at<=now() AND (c.scheduled_for IS NULL OR c.scheduled_for<=now()) AND (e.claimed_until IS NULL OR e.claimed_until<now())
 ORDER BY e.next_run_at,e.id LIMIT 1 FOR UPDATE OF e SKIP LOCKED) chosen
 ), rotation AS (
 UPDATE public.marketing_channel_health h SET last_claimed_at=clock_timestamp() FROM candidates c WHERE h.connection_id=c.connection_id RETURNING h.connection_id
 ) UPDATE public.marketing_enrollments e SET claim_token=gen_random_uuid(),claimed_until=clock_timestamp()+interval '90 seconds'
 FROM candidates c JOIN rotation r ON r.connection_id=c.connection_id WHERE e.id=c.id RETURNING e.*
$$;

CREATE TABLE public.marketing_worker_runs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 finished_at timestamptz,status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','success','failed')),result jsonb NOT NULL DEFAULT '{}');
CREATE INDEX marketing_worker_runs_recent ON public.marketing_worker_runs(started_at DESC);
ALTER TABLE public.marketing_worker_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_worker_runs FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.record_marketing_worker_run(p_run uuid DEFAULT NULL,p_result jsonb DEFAULT NULL,p_failed boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE run uuid;
BEGIN
 IF p_run IS NULL THEN INSERT INTO public.marketing_worker_runs DEFAULT VALUES RETURNING id INTO run; RETURN run; END IF;
 UPDATE public.marketing_worker_runs SET finished_at=clock_timestamp(),status=CASE WHEN p_failed THEN 'failed' ELSE 'success' END,
 result=jsonb_build_object('processed',p_result->'processed','failed',p_result->'failed','deferred',p_result->'deferred','finalized',p_result->'finalized')
 WHERE id=p_run AND status='running';
 IF NOT FOUND THEN RAISE EXCEPTION 'Worker run unavailable'; END IF;
 DELETE FROM public.marketing_worker_runs WHERE id IN(SELECT id FROM public.marketing_worker_runs
 WHERE started_at<clock_timestamp()-interval '30 days' ORDER BY started_at LIMIT 100);
 RETURN p_run;
END $$;
REVOKE ALL ON FUNCTION public.record_marketing_worker_run(uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_marketing_worker_run(uuid,jsonb,boolean) TO service_role;
ALTER FUNCTION public.read_marketing_campaign_metrics(uuid,uuid) RENAME TO read_marketing_campaign_metrics_before_runtime;
REVOKE ALL ON FUNCTION public.read_marketing_campaign_metrics_before_runtime(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.read_marketing_campaign_metrics(p_org uuid,p_campaign uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; connection uuid;
BEGIN
 result:=public.read_marketing_campaign_metrics_before_runtime(p_org,p_campaign);
 SELECT connection_id INTO connection FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org;
 RETURN result||jsonb_build_object('channelHealth',public.read_marketing_channel_health(p_org,connection),'runtime',
 (SELECT jsonb_build_object('startedAt',started_at,'finishedAt',finished_at,'status',status) FROM public.marketing_worker_runs ORDER BY started_at DESC LIMIT 1));
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_campaign_metrics(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_campaign_metrics(uuid,uuid) TO authenticated,service_role;
COMMIT;
