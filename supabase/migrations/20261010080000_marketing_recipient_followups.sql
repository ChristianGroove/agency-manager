BEGIN;
-- Read existing Inbox records; no new trigger or write in inbound message handling.
CREATE INDEX IF NOT EXISTS marketing_inbound_reply_lookup ON public.messages(organization_id,conversation_id,created_at)
 WHERE direction='inbound' AND channel='whatsapp';
CREATE INDEX IF NOT EXISTS marketing_operation_enrollment_lookup ON public.meta_outbound_outbox(organization_id,(split_part(operation_key,':',2)),status,created_at)
 WHERE operation_key LIKE 'campaign:%';

CREATE FUNCTION public.marketing_reply_at(p_org uuid,p_enrollment uuid)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT m.created_at FROM public.marketing_enrollments e
 JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=e.organization_id
 JOIN public.meta_outbound_outbox o ON o.organization_id=e.organization_id AND o.connection_id=c.connection_id
  AND o.operation_key LIKE 'campaign:%' AND split_part(o.operation_key,':',2)=e.id::text AND o.status IN('accepted','unknown')
 JOIN public.conversations cv ON cv.id=o.conversation_id AND cv.organization_id=e.organization_id AND cv.connection_id=c.connection_id
 JOIN public.messages m ON m.conversation_id=cv.id AND m.organization_id=e.organization_id
 WHERE e.organization_id=p_org AND e.id=p_enrollment AND c.execution_version=2
 -- Meta timestamps have second precision. Ignore replies before the first dispatch claim, including time spent queued.
 AND m.direction='inbound' AND m.channel='whatsapp' AND m.created_at>=date_trunc('second',coalesce(o.claimed_at,o.created_at))
 AND coalesce(m.metadata->>'historical','false')<>'true'
 AND coalesce(m.metadata->'metadata'->>'historical','false')<>'true'
 LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.marketing_reply_at(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_reply_at(uuid,uuid) TO service_role;

CREATE FUNCTION public.stop_marketing_followups_on_reply(p_org uuid,p_connection uuid,p_operation text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='2s' AS $$
DECLARE enrollment uuid; reply_at timestamptz; operation public.meta_outbound_outbox;
BEGIN
 SELECT e.id INTO enrollment FROM public.marketing_enrollments e JOIN public.marketing_campaigns c
 ON c.id=e.campaign_id AND c.organization_id=e.organization_id
 WHERE e.organization_id=p_org AND c.connection_id=p_connection AND c.execution_version=2
 AND p_operation='campaign:'||e.id::text||':'||e.current_step_id::text
 AND e.status IN('active','paused','cancelled');
 IF enrollment IS NULL THEN RETURN false; END IF;
 reply_at:=public.marketing_reply_at(p_org,enrollment);
 IF reply_at IS NULL THEN RETURN false; END IF;
 UPDATE public.marketing_enrollments SET status='cancelled',next_run_at=NULL,claim_token=NULL,claimed_until=NULL,
 last_error='El contacto respondió; seguimientos detenidos.',last_run_at=clock_timestamp()
 WHERE id=enrollment AND organization_id=p_org AND status IN('active','paused');
 -- Only queued operations can be cancelled here; a Graph request in flight is never rewritten.
 FOR operation IN UPDATE public.meta_outbound_outbox SET status='sending',claimed_at=clock_timestamp()
 WHERE organization_id=p_org AND connection_id=p_connection AND status='queued'
 AND operation_key LIKE 'campaign:%' AND split_part(operation_key,':',2)=enrollment::text RETURNING * LOOP
  PERFORM public.finish_meta_outbound(operation.id,'failed',NULL,'campaign_replied');
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.stop_marketing_followups_on_reply(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stop_marketing_followups_on_reply(uuid,uuid,text) TO service_role;

ALTER FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) RENAME TO marketing_outbound_allowed_before_reply;
REVOKE ALL ON FUNCTION public.marketing_outbound_allowed_before_reply(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.marketing_outbound_allowed(p_org uuid,p_connection uuid,p_operation text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.marketing_outbound_allowed_before_reply(p_org,p_connection,p_operation)
 AND EXISTS(SELECT 1 FROM public.marketing_enrollments e WHERE e.organization_id=p_org
  AND p_operation='campaign:'||e.id::text||':'||e.current_step_id::text AND public.marketing_reply_at(p_org,e.id) IS NULL)
$$;
REVOKE ALL ON FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) TO service_role;

-- One lock per tenant / normalized recipient, shared across connected numbers.
CREATE TABLE public.marketing_recipient_pacing(
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 recipient text NOT NULL, campaign_id uuid NOT NULL, outbox_id uuid NOT NULL,
 reserved_at timestamptz NOT NULL, next_campaign_at timestamptz NOT NULL,
 accepted_campaign_id uuid, accepted_at timestamptz, accepted_next_at timestamptz,
 PRIMARY KEY(organization_id,recipient)
);
ALTER TABLE public.marketing_recipient_pacing ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_recipient_pacing FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.marketing_recipient_pacing TO service_role;

ALTER FUNCTION public.reserve_marketing_dispatch(uuid,uuid,text,uuid) RENAME TO reserve_marketing_dispatch_before_recipient;
REVOKE ALL ON FUNCTION public.reserve_marketing_dispatch_before_recipient(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.reserve_marketing_dispatch(p_org uuid,p_connection uuid,p_operation text,p_outbox uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='2s' AS $$
DECLARE recipient_key text; campaign uuid; config jsonb; hours integer; at_time timestamptz; due timestamptz;
 prior public.marketing_recipient_pacing; prior_status text; accepted_time timestamptz; gate jsonb;
BEGIN
 SELECT e.recipient,c.id,c.delivery_config INTO recipient_key,campaign,config FROM public.marketing_enrollments e
 JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=e.organization_id
 JOIN public.meta_outbound_outbox o ON o.organization_id=e.organization_id AND o.id=p_outbox AND o.connection_id=c.connection_id
 WHERE e.organization_id=p_org AND c.connection_id=p_connection AND o.status='sending' AND o.recipient=e.recipient
 AND o.operation_key=p_operation AND p_operation='campaign:'||e.id::text||':'||e.current_step_id::text;
 IF recipient_key IS NULL THEN RETURN jsonb_build_object('allowed',false,'retryAt',clock_timestamp()+interval '5 minutes'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('marketing-frequency:'||p_org::text||':'||recipient_key,0));
 IF public.stop_marketing_followups_on_reply(p_org,p_connection,p_operation) THEN
  RETURN jsonb_build_object('allowed',false,'cancelled',true,'reason','campaign_replied');
 END IF;
 -- Absent configuration preserves the previous behavior; new drafts expose the setting explicitly.
 IF config ? 'recipient_cooldown_hours' AND (jsonb_typeof(config->'recipient_cooldown_hours')<>'number'
  OR config->>'recipient_cooldown_hours' !~ '^[0-9]{1,3}$') THEN RAISE EXCEPTION 'Invalid recipient frequency'; END IF;
 hours:=coalesce((config->>'recipient_cooldown_hours')::integer,0);
 IF hours NOT BETWEEN 0 AND 720 THEN RAISE EXCEPTION 'Invalid recipient frequency'; END IF;
 at_time:=clock_timestamp();
 SELECT * INTO prior FROM public.marketing_recipient_pacing WHERE organization_id=p_org AND recipient=recipient_key;
 IF FOUND AND prior.outbox_id<>p_outbox THEN
  SELECT status,greatest(updated_at,prior.reserved_at) INTO prior_status,accepted_time FROM public.meta_outbound_outbox WHERE id=prior.outbox_id AND organization_id=p_org;
  IF prior_status IN('sending','unknown') THEN
   RETURN jsonb_build_object('allowed',false,'reason','recipient_unconfirmed','retryAt',at_time+interval '5 minutes');
  END IF;
  IF prior_status='accepted' THEN
   prior.accepted_campaign_id:=prior.campaign_id; prior.accepted_at:=accepted_time;
   prior.accepted_next_at:=accepted_time+(prior.next_campaign_at-prior.reserved_at);
   UPDATE public.marketing_recipient_pacing SET accepted_campaign_id=prior.accepted_campaign_id,
    accepted_at=prior.accepted_at,accepted_next_at=prior.accepted_next_at WHERE organization_id=p_org AND recipient=recipient_key;
  END IF;
  IF prior.accepted_campaign_id IS NOT NULL AND prior.accepted_campaign_id<>campaign THEN
   due:=greatest(prior.accepted_next_at,prior.accepted_at+make_interval(hours=>hours));
   IF due>at_time THEN RETURN jsonb_build_object('allowed',false,'reason','recipient_frequency','retryAt',due); END IF;
  END IF;
 END IF;
 gate:=public.reserve_marketing_dispatch_before_recipient(p_org,p_connection,p_operation,p_outbox);
 IF gate->>'allowed'='true' THEN
  INSERT INTO public.marketing_recipient_pacing(organization_id,recipient,campaign_id,outbox_id,reserved_at,next_campaign_at)
  VALUES(p_org,recipient_key,campaign,p_outbox,at_time,at_time+make_interval(hours=>hours))
  ON CONFLICT(organization_id,recipient) DO UPDATE SET campaign_id=excluded.campaign_id,outbox_id=excluded.outbox_id,
   reserved_at=excluded.reserved_at,next_campaign_at=excluded.next_campaign_at;
 END IF;
 RETURN gate;
END $$;
REVOKE ALL ON FUNCTION public.reserve_marketing_dispatch(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_marketing_dispatch(uuid,uuid,text,uuid) TO service_role;
COMMIT;
