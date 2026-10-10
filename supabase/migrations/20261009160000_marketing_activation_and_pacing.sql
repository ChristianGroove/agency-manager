-- Internal campaign controls only. Does not activate or enroll existing campaigns.
BEGIN;
CREATE OR REPLACE FUNCTION public.marketing_schedule_open(p_config jsonb,p_at timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path=public,pg_temp AS $$
DECLARE zone text; hour integer; start_hour integer; end_hour integer;
BEGIN
 zone:=coalesce(p_config->>'timezone','America/Bogota');
 IF p_config->>'mode' NOT IN ('stealth','growth','turbo') OR p_config->>'mode' IS NULL THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RETURN false; END IF;
 IF p_config->'schedule_window' IS NULL THEN RETURN true; END IF;
 start_hour:=(p_config->'schedule_window'->>'start')::integer;
 end_hour:=(p_config->'schedule_window'->>'end')::integer;
 IF start_hour IS NULL OR end_hour IS NULL OR start_hour<0 OR end_hour>24 OR start_hour>=end_hour THEN RETURN false; END IF;
 hour:=extract(hour FROM p_at AT TIME ZONE zone);
 RETURN hour>=start_hour AND hour<end_hour;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.marketing_schedule_open(jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_schedule_open(jsonb,timestamptz) TO service_role;

-- A backlogged connection cannot fill the whole batch and starve other connected numbers.
CREATE INDEX IF NOT EXISTS marketing_active_connections ON public.marketing_campaigns(connection_id,id)
 WHERE status='active' AND execution_version=2;
CREATE INDEX IF NOT EXISTS marketing_campaign_due_jobs ON public.marketing_enrollments(campaign_id,next_run_at,id)
 WHERE status='active';
CREATE OR REPLACE FUNCTION public.claim_marketing_enrollments(p_limit integer DEFAULT 25)
RETURNS SETOF public.marketing_enrollments LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH numbers AS (
  SELECT DISTINCT connection_id FROM public.marketing_campaigns
   WHERE status='active' AND execution_version=2 AND connection_id IS NOT NULL
 ), candidates AS (
  SELECT chosen.id,chosen.next_run_at FROM numbers n CROSS JOIN LATERAL (
   SELECT e.id,e.next_run_at FROM public.marketing_enrollments e JOIN public.marketing_campaigns c
    ON c.id=e.campaign_id AND c.organization_id=e.organization_id
   WHERE c.connection_id=n.connection_id AND c.status='active' AND c.execution_version=2 AND e.status='active'
    AND e.next_run_at<=now() AND (c.scheduled_for IS NULL OR c.scheduled_for<=now())
    AND (e.claimed_until IS NULL OR e.claimed_until<now())
   ORDER BY e.next_run_at,e.id LIMIT 1 FOR UPDATE OF e SKIP LOCKED
  ) chosen ORDER BY chosen.next_run_at,chosen.id LIMIT greatest(1,least(p_limit,25))
 ) UPDATE public.marketing_enrollments e SET claim_token=gen_random_uuid(),claimed_until=now()+interval '90 seconds'
 FROM candidates c WHERE e.id=c.id RETURNING e.*;
$$;
REVOKE ALL ON FUNCTION public.claim_marketing_enrollments(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketing_enrollments(integer) TO service_role;
CREATE OR REPLACE FUNCTION public.marketing_outbound_allowed(p_org uuid,p_connection uuid,p_operation text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.marketing_enrollments e
 JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=e.organization_id
 JOIN public.marketing_sequences s ON s.id=e.sequence_id AND s.campaign_id=c.id AND s.organization_id=c.organization_id
 JOIN public.marketing_steps st ON st.id=e.current_step_id AND st.sequence_id=s.id AND st.organization_id=c.organization_id
 JOIN public.integration_connections ch ON ch.id=c.connection_id AND ch.organization_id=c.organization_id AND ch.status='active'
 JOIN public.messaging_templates t ON t.id::text=st.content->>'template_id' AND t.organization_id=c.organization_id AND t.channel_id=c.connection_id
 JOIN public.leads l ON l.id=e.contact_id AND l.organization_id=c.organization_id
 WHERE e.organization_id=p_org AND c.connection_id=p_connection AND c.status='active' AND c.execution_version=2
 AND e.status='active' AND s.is_active AND l.deleted_at IS NULL AND l.marketing_opted_out IS NOT TRUE
 AND st.type='whatsapp' AND t.status='APPROVED' AND t.category='MARKETING' AND nullif(t.meta_id,'') IS NOT NULL
 AND t.name=st.content->>'template_name' AND t.language=st.content->>'template_language'
 AND public.marketing_phone_key(l.phone)=e.recipient AND public.marketing_recipient_allowed(p_org,e.recipient)
 AND p_operation='campaign:'||e.id::text||':'||e.current_step_id::text
 AND public.marketing_schedule_open(c.delivery_config,clock_timestamp())
 AND (c.scheduled_for IS NULL OR c.scheduled_for<=now()))
$$;
REVOKE ALL ON FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) TO service_role;


-- Shared by physical Meta phone-number ID, including different campaigns/connections.
CREATE TABLE IF NOT EXISTS public.marketing_number_pacing(
 number_key text PRIMARY KEY,
 next_dispatch_at timestamptz NOT NULL DEFAULT '-infinity',
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_number_pacing ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_number_pacing FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.marketing_number_pacing TO service_role;
CREATE OR REPLACE FUNCTION public.reserve_marketing_dispatch(p_org uuid,p_connection uuid,p_operation text,p_outbox uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE number_id text; config jsonb; due timestamptz; at_time timestamptz; seconds integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.meta_outbound_outbox WHERE id=p_outbox AND organization_id=p_org
  AND connection_id=p_connection AND operation_key=p_operation AND status='sending') THEN
  RETURN jsonb_build_object('allowed',false,'retryAt',clock_timestamp()+interval '5 minutes');
 END IF;
 SELECT coalesce(nullif(i.metadata->>'phone_number_id',''),nullif(i.metadata->>'asset_id','')),c.delivery_config
 INTO number_id,config FROM public.marketing_enrollments e
 JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=e.organization_id
 JOIN public.integration_connections i ON i.id=c.connection_id AND i.organization_id=c.organization_id
 WHERE e.organization_id=p_org AND c.connection_id=p_connection
  AND p_operation='campaign:'||e.id::text||':'||e.current_step_id::text;
 IF number_id IS NULL OR NOT public.marketing_outbound_allowed(p_org,p_connection,p_operation) THEN
  RETURN jsonb_build_object('allowed',false,'retryAt',clock_timestamp()+interval '5 minutes');
 END IF;
 INSERT INTO public.marketing_number_pacing(number_key) VALUES(number_id) ON CONFLICT DO NOTHING;
 SELECT next_dispatch_at INTO due FROM public.marketing_number_pacing WHERE number_key=number_id FOR UPDATE;
 at_time:=clock_timestamp();
 -- Revalidate after acquiring the shared number lock, using wall-clock time.
 IF NOT public.marketing_outbound_allowed(p_org,p_connection,p_operation) THEN
  RETURN jsonb_build_object('allowed',false,'retryAt',at_time+interval '5 minutes');
 END IF;
 IF due>at_time THEN RETURN jsonb_build_object('allowed',false,'retryAt',due); END IF;
 seconds:=CASE config->>'mode' WHEN 'stealth' THEN 180 WHEN 'growth' THEN 30 WHEN 'turbo' THEN 5 ELSE NULL END;
 IF seconds IS NULL THEN RETURN jsonb_build_object('allowed',false,'retryAt',at_time+interval '5 minutes'); END IF;
 -- Positive jitter only; never shortens the configured minimum. This is capacity pacing, not anti-ban evasion.
 IF config->>'humanize'='true' THEN seconds:=seconds+ceil(random()*seconds*0.2)::integer; END IF;
 UPDATE public.marketing_number_pacing SET next_dispatch_at=at_time+make_interval(secs=>seconds),
  updated_at=at_time WHERE number_key=number_id;
 RETURN jsonb_build_object('allowed',true,'retryAt',at_time);
END $$;
REVOKE ALL ON FUNCTION public.reserve_marketing_dispatch(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_marketing_dispatch(uuid,uuid,text,uuid) TO service_role;

ALTER TABLE public.marketing_enrollments ADD COLUMN IF NOT EXISTS recipient_snapshot jsonb;
CREATE OR REPLACE FUNCTION public.marketing_recipient_snapshot_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.recipient_snapshot IS DISTINCT FROM OLD.recipient_snapshot THEN RAISE EXCEPTION 'Recipient snapshot is immutable'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS marketing_recipient_snapshot_guard ON public.marketing_enrollments;
CREATE TRIGGER marketing_recipient_snapshot_guard BEFORE UPDATE ON public.marketing_enrollments
 FOR EACH ROW EXECUTE FUNCTION public.marketing_recipient_snapshot_guard();

-- Marketing-only creation. The advisory lock serializes campaign workers for one contact/number.
CREATE OR REPLACE FUNCTION public.marketing_get_conversation(p_org uuid,p_contact uuid,p_connection uuid,p_recipient text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.leads WHERE id=p_contact AND organization_id=p_org AND deleted_at IS NULL
   AND public.marketing_phone_key(phone)=p_recipient)
 OR NOT EXISTS(SELECT 1 FROM public.integration_connections WHERE id=p_connection AND organization_id=p_org
   AND status='active' AND provider_key IN ('whatsapp_cloud','meta_whatsapp')) THEN
   RAISE EXCEPTION 'Campaign conversation context unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':'||p_contact::text||':'||p_connection::text,0));
 SELECT id INTO result FROM public.conversations WHERE organization_id=p_org AND lead_id=p_contact
   AND connection_id=p_connection AND channel='whatsapp' AND state='active'
   AND public.marketing_phone_key(phone)=p_recipient ORDER BY updated_at DESC,id LIMIT 1;
 IF result IS NULL THEN
   INSERT INTO public.conversations(organization_id,lead_id,connection_id,phone,channel,status,state,metadata)
   VALUES(p_org,p_contact,p_connection,p_recipient,'whatsapp','open','active','{"source":"marketing_campaign"}'::jsonb) RETURNING id INTO result;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.marketing_get_conversation(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_get_conversation(uuid,uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.marketing_activation_design(p_org uuid,p_campaign uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object(
  'campaign',jsonb_build_object('id',c.id,'connection_id',c.connection_id,'audience_id',c.audience_id,
   'delivery_config',c.delivery_config,'scheduled_for',c.scheduled_for),
  'filters',(SELECT filter_config FROM public.marketing_audiences WHERE id=c.audience_id AND organization_id=p_org),
  'channel',(SELECT jsonb_build_object('id',id,'status',status,'provider',provider_key,
   'number_id',coalesce(nullif(metadata->>'phone_number_id',''),nullif(metadata->>'asset_id','')))
   FROM public.integration_connections WHERE id=c.connection_id AND organization_id=p_org),
  'sequences',coalesce((SELECT jsonb_agg(to_jsonb(s)||jsonb_build_object('steps',coalesce((
   SELECT jsonb_agg(to_jsonb(st) ORDER BY st.order_index,st.id) FROM public.marketing_steps st
    WHERE st.sequence_id=s.id AND st.organization_id=p_org),'[]'::jsonb)) ORDER BY s.id)
   FROM public.marketing_sequences s WHERE s.campaign_id=c.id AND s.organization_id=p_org AND s.is_active),'[]'::jsonb),
  'templates',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'channel_id',t.channel_id,'name',t.name,
   'language',t.language,'status',t.status,'category',t.category,'meta_id',t.meta_id,'components',t.components) ORDER BY t.id)
   FROM public.messaging_templates t WHERE t.organization_id=p_org AND t.channel_id=c.connection_id AND EXISTS(
    SELECT 1 FROM public.marketing_steps st JOIN public.marketing_sequences s ON s.id=st.sequence_id
    WHERE s.campaign_id=c.id AND s.is_active AND st.content->>'template_id'=t.id::text)),'[]'::jsonb))
 FROM public.marketing_campaigns c WHERE c.id=p_campaign AND c.organization_id=p_org;
$$;
REVOKE ALL ON FUNCTION public.marketing_activation_design(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_activation_design(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.read_marketing_activation(p_org uuid,p_campaign uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('review',public.read_marketing_preflight(p_org,p_campaign),
   'design',d,'fingerprint',md5(d::text)) FROM (SELECT public.marketing_activation_design(p_org,p_campaign) d) design;
$$;
REVOKE ALL ON FUNCTION public.read_marketing_activation(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_marketing_activation(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.activate_marketing_campaign(p_org uuid,p_campaign uuid,p_fingerprint text,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE camp public.marketing_campaigns; design jsonb; review jsonb; seq_id uuid; first_step uuid; enrolled integer;
BEGIN
 SELECT * INTO camp FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campaign unavailable'; END IF;
 design:=public.marketing_activation_design(p_org,p_campaign);
 IF md5(design::text) IS DISTINCT FROM p_fingerprint THEN RAISE EXCEPTION 'Campaign changed; review again'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organization_members m LEFT JOIN public.organization_roles r ON r.id=m.role_id
   AND r.organization_id=m.organization_id WHERE m.organization_id=p_org AND m.user_id=p_actor
   AND m.deleted_at IS NULL AND coalesce(m.status,'active')='active' AND CASE
    WHEN m.permissions ? 'marketing.campaigns.execute' THEN m.permissions->>'marketing.campaigns.execute'='true'
    WHEN r.permissions ? 'marketing.campaigns.execute' THEN r.permissions->>'marketing.campaigns.execute'='true'
    ELSE m.role IN ('owner','admin') OR r.hierarchy_level=100 OR r.permissions->>'all'='true' OR m.permissions->>'all'='true' END)
 THEN RAISE EXCEPTION 'Marketing execution denied'; END IF;
 IF camp.status='active' AND camp.execution_version=2 THEN
   RETURN jsonb_build_object('enrolled',0,'resumed',false,'alreadyActive',true); END IF;
 IF camp.status NOT IN ('draft','paused') OR (camp.status='paused' AND camp.execution_version IS DISTINCT FROM 2)
 OR (camp.status='draft' AND camp.execution_version IS NOT NULL) THEN RAISE EXCEPTION 'Campaign cannot be activated'; END IF;
 IF design->'channel'->>'status' IS DISTINCT FROM 'active'
 OR design->'channel'->>'provider' NOT IN ('whatsapp_cloud','meta_whatsapp')
 OR nullif(design->'channel'->>'number_id','') IS NULL THEN RAISE EXCEPTION 'Active WhatsApp number required'; END IF;
 review:=public.read_marketing_preflight(p_org,p_campaign);
 IF jsonb_array_length(design->'sequences')<>1 THEN
   RAISE EXCEPTION 'Campaign design incomplete'; END IF;
 seq_id:=(design->'sequences'->0->>'id')::uuid;
 SELECT id INTO first_step FROM public.marketing_steps WHERE sequence_id=seq_id AND organization_id=p_org
   ORDER BY order_index,id LIMIT 1;
 IF first_step IS NULL OR NOT EXISTS(SELECT 1 FROM public.marketing_steps WHERE sequence_id=seq_id AND type='whatsapp')
 THEN RAISE EXCEPTION 'WhatsApp steps required'; END IF;
 IF camp.status='paused' THEN
   UPDATE public.marketing_campaigns SET status='active',paused_reason=NULL WHERE id=camp.id;
   RETURN jsonb_build_object('enrolled',0,'resumed',true);
 END IF;
 IF (review->>'missingData')::integer>0 THEN RAISE EXCEPTION 'Recipient data incomplete'; END IF;
 IF coalesce((review->'audience'->>'eligible')::integer,0)=0 THEN RAISE EXCEPTION 'No eligible recipients'; END IF;
 INSERT INTO public.marketing_enrollments(organization_id,campaign_id,sequence_id,contact_id,recipient,
  recipient_snapshot,current_step_id,status,next_run_at)
 SELECT p_org,camp.id,seq_id,l.id,public.marketing_phone_key(l.phone),
  jsonb_build_object('name',l.name,'company',l.company_name,'phone',public.marketing_phone_key(l.phone)),
  first_step,'active',greatest(clock_timestamp(),coalesce(camp.scheduled_for,clock_timestamp()))
 FROM (SELECT DISTINCT ON (public.marketing_phone_key(phone)) * FROM
   public.marketing_audience_candidates(p_org,design->'filters') l
   WHERE public.marketing_recipient_allowed(p_org,public.marketing_phone_key(l.phone))
   ORDER BY public.marketing_phone_key(phone),id) l;
 GET DIAGNOSTICS enrolled=ROW_COUNT;
 IF enrolled=0 THEN RAISE EXCEPTION 'No eligible recipients'; END IF;
 UPDATE public.marketing_campaigns SET status='active',execution_version=2,paused_reason=NULL,
   execution_snapshot=jsonb_build_object('design',design,'fingerprint',p_fingerprint,'recipientCount',enrolled,
   'activatedAt',clock_timestamp(),'activatedBy',p_actor) WHERE id=camp.id;
 RETURN jsonb_build_object('enrolled',enrolled,'resumed',false);
END $$;
REVOKE ALL ON FUNCTION public.activate_marketing_campaign(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_marketing_campaign(uuid,uuid,text,uuid) TO service_role;
COMMIT;
