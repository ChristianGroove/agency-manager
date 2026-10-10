BEGIN;

CREATE OR REPLACE FUNCTION public.marketing_has_permission(p_org uuid, p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.organization_members m
   LEFT JOIN public.organization_roles r ON r.id=m.role_id AND r.organization_id=m.organization_id
   WHERE m.organization_id=p_org AND m.user_id=auth.uid()
     AND m.deleted_at IS NULL AND coalesce(m.status,'active') = 'active'
     AND CASE
       WHEN m.permissions ? ('marketing.campaigns.' || p_permission)
         THEN m.permissions->>('marketing.campaigns.' || p_permission) = 'true'
       WHEN r.permissions ? ('marketing.campaigns.' || p_permission)
         THEN r.permissions->>('marketing.campaigns.' || p_permission) = 'true'
       ELSE m.role IN ('owner','admin') OR r.hierarchy_level=100 OR
         r.permissions->>'all'='true' OR m.permissions->>'all'='true'
     END
 );
$$;
REVOKE ALL ON FUNCTION public.marketing_has_permission(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketing_has_permission(uuid,text) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.marketing_check_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE row_data jsonb; seq public.marketing_sequences; camp public.marketing_campaigns; lead_org uuid;
BEGIN
 row_data := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_OP='UPDATE' AND NEW.organization_id <> OLD.organization_id THEN
   RAISE EXCEPTION 'Marketing organization is immutable';
 END IF;
 IF TG_TABLE_NAME='marketing_steps' THEN
   SELECT * INTO seq FROM public.marketing_sequences WHERE id=(row_data->>'sequence_id')::uuid;
   IF NOT FOUND AND TG_OP='DELETE' THEN RETURN OLD; END IF;
   IF NOT FOUND OR seq.organization_id <> (row_data->>'organization_id')::uuid THEN RAISE EXCEPTION 'Invalid marketing sequence'; END IF;
   IF TG_OP='UPDATE' AND NEW.sequence_id <> OLD.sequence_id THEN RAISE EXCEPTION 'Marketing sequence is immutable'; END IF;
   SELECT * INTO camp FROM public.marketing_campaigns WHERE id=seq.campaign_id FOR UPDATE;
 ELSIF TG_TABLE_NAME='marketing_sequences' THEN
   SELECT * INTO camp FROM public.marketing_campaigns WHERE id=(row_data->>'campaign_id')::uuid FOR UPDATE;
   IF TG_OP='UPDATE' AND NEW.campaign_id IS DISTINCT FROM OLD.campaign_id THEN RAISE EXCEPTION 'Marketing campaign is immutable'; END IF;
 ELSE
   -- Enrollment checkpoints already own their row; never wait for the campaign
   -- lock while holding it (pause/revocation locks campaigns before enrollments).
   IF TG_OP='UPDATE' AND (NEW.campaign_id IS DISTINCT FROM OLD.campaign_id
     OR NEW.sequence_id IS DISTINCT FROM OLD.sequence_id OR NEW.contact_id IS DISTINCT FROM OLD.contact_id
     OR NEW.recipient IS DISTINCT FROM OLD.recipient) THEN RAISE EXCEPTION 'Enrollment identity is immutable'; END IF;
   SELECT * INTO camp FROM public.marketing_campaigns WHERE id=(row_data->>'campaign_id')::uuid;
   SELECT * INTO seq FROM public.marketing_sequences WHERE id=(row_data->>'sequence_id')::uuid;
   SELECT organization_id INTO lead_org FROM public.leads WHERE id=(row_data->>'contact_id')::uuid;
   IF seq.campaign_id IS DISTINCT FROM camp.id OR seq.organization_id IS DISTINCT FROM camp.organization_id
     OR lead_org IS DISTINCT FROM camp.organization_id THEN RAISE EXCEPTION 'Invalid marketing enrollment'; END IF;
   IF row_data->>'current_step_id' IS NOT NULL AND NOT EXISTS (
     SELECT 1 FROM public.marketing_steps WHERE id=(row_data->>'current_step_id')::uuid
       AND sequence_id=seq.id AND organization_id=camp.organization_id
   ) THEN RAISE EXCEPTION 'Invalid marketing step'; END IF;
 END IF;
 IF camp.id IS NULL AND TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF camp.id IS NULL OR camp.organization_id <> (row_data->>'organization_id')::uuid THEN RAISE EXCEPTION 'Invalid marketing campaign'; END IF;
 IF TG_TABLE_NAME <> 'marketing_enrollments' AND (camp.status <> 'draft' OR camp.execution_version IS NOT NULL) THEN
   RAISE EXCEPTION 'Only draft campaigns can be edited';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;

-- Canonical matching only. Country/number validity is checked by the application
-- before recording consent; SQL never guesses a country for a local number.
CREATE OR REPLACE FUNCTION public.marketing_phone_key(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=public,pg_temp AS $$
 SELECT CASE WHEN regexp_replace(coalesce(p_phone,''),'[[:space:]()+.\-]','','g') ~ '^[1-9][0-9]{7,14}$'
 THEN regexp_replace(p_phone,'[[:space:]()+.\-]','','g') END
$$;
CREATE INDEX IF NOT EXISTS marketing_lead_recipient_idx
 ON public.leads(organization_id,public.marketing_phone_key(phone)) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.marketing_consent_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 recipient text CHECK(recipient ~ '^[1-9][0-9]{7,14}$'),
 contact_id uuid,
 purpose text NOT NULL DEFAULT 'marketing' CHECK(purpose='marketing'),
 event text NOT NULL CHECK(event IN ('granted','revoked')),
 source text NOT NULL CHECK(length(source) BETWEEN 1 AND 120),
 evidence text NOT NULL CHECK(length(evidence) BETWEEN 1 AND 2000),
 occurred_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 CHECK(occurred_at <= recorded_at)
);
ALTER TABLE public.marketing_consent_events ADD COLUMN IF NOT EXISTS contact_id uuid;
ALTER TABLE public.marketing_consent_events ALTER COLUMN recipient DROP NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.marketing_consent_events'::regclass AND conname='marketing_consent_subject_check') THEN
   ALTER TABLE public.marketing_consent_events ADD CONSTRAINT marketing_consent_subject_check
     CHECK(recipient IS NOT NULL OR (event='revoked' AND contact_id IS NOT NULL));
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS marketing_consent_latest_idx
 ON public.marketing_consent_events(organization_id,recipient,id DESC);
ALTER TABLE public.marketing_consent_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_consent_events FROM anon,authenticated;
GRANT SELECT ON public.marketing_consent_events TO authenticated;
REVOKE ALL ON public.marketing_consent_events FROM service_role;
GRANT SELECT,INSERT ON public.marketing_consent_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.marketing_consent_events_id_seq TO service_role;
DROP POLICY IF EXISTS marketing_consent_read ON public.marketing_consent_events;
CREATE POLICY marketing_consent_read ON public.marketing_consent_events FOR SELECT TO authenticated
 USING(public.marketing_has_permission(organization_id,'view'));

CREATE OR REPLACE FUNCTION public.marketing_recipient_allowed(p_org uuid,p_recipient text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p_recipient IS NOT NULL AND coalesce((SELECT event='granted' FROM public.marketing_consent_events
 WHERE organization_id=p_org AND recipient=p_recipient ORDER BY id DESC LIMIT 1),false)
 AND NOT EXISTS(SELECT 1 FROM public.leads WHERE organization_id=p_org AND deleted_at IS NULL
 AND public.marketing_phone_key(phone)=p_recipient AND marketing_opted_out IS TRUE)
$$;
REVOKE ALL ON FUNCTION public.marketing_recipient_allowed(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_recipient_allowed(uuid,text) TO service_role;

-- Append-only evidence. Granting does not undo an existing opt-out.
CREATE OR REPLACE FUNCTION public.record_marketing_consent(p_org uuid,p_recipient text,p_event text,
 p_source text,p_evidence text,p_occurred_at timestamptz,p_actor uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE event_id bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':'||p_recipient,0));
 IF p_event NOT IN ('granted','revoked') OR p_recipient IS NULL OR p_recipient !~ '^[1-9][0-9]{7,14}$'
 OR p_occurred_at IS NULL OR p_occurred_at > clock_timestamp() THEN RAISE EXCEPTION 'Invalid consent'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.leads WHERE organization_id=p_org AND deleted_at IS NULL
   AND public.marketing_phone_key(phone)=p_recipient) THEN RAISE EXCEPTION 'Recipient not found'; END IF;
 IF p_event='granted' AND EXISTS(SELECT 1 FROM public.leads WHERE organization_id=p_org AND deleted_at IS NULL
   AND public.marketing_phone_key(phone)=p_recipient AND marketing_opted_out IS TRUE) THEN
   RAISE EXCEPTION 'Existing opt-out requires explicit renewal, not an imported grant';
 END IF;
 INSERT INTO public.marketing_consent_events(organization_id,recipient,event,source,evidence,occurred_at,recorded_by)
 VALUES(p_org,p_recipient,p_event,p_source,p_evidence,p_occurred_at,p_actor) RETURNING id INTO event_id;
 IF p_event='revoked' THEN
   -- Campaigns are locked before enrollments to match the design/worker lock order.
   PERFORM 1 FROM public.marketing_campaigns WHERE organization_id=p_org AND id IN (
     SELECT campaign_id FROM public.marketing_enrollments WHERE organization_id=p_org AND recipient=p_recipient
   ) ORDER BY id FOR UPDATE;
   UPDATE public.leads SET marketing_opted_out=true,opted_out_at=now() WHERE organization_id=p_org
     AND deleted_at IS NULL AND public.marketing_phone_key(phone)=p_recipient;
   UPDATE public.marketing_enrollments SET status='cancelled',next_run_at=NULL,claim_token=NULL,claimed_until=NULL,
     last_error='Consentimiento revocado.' WHERE organization_id=p_org AND status='active'
     AND (recipient=p_recipient OR contact_id IN(SELECT id FROM public.leads WHERE organization_id=p_org
       AND public.marketing_phone_key(phone)=p_recipient));
 END IF;
 RETURN event_id;
END $$;
REVOKE ALL ON FUNCTION public.record_marketing_consent(uuid,text,text,text,text,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_marketing_consent(uuid,text,text,text,text,timestamptz,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_marketing_contact(p_org uuid,p_contact uuid,p_actor uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE recipient_key text; event_id bigint;
BEGIN
 SELECT public.marketing_phone_key(phone) INTO recipient_key FROM public.leads WHERE id=p_contact AND organization_id=p_org AND deleted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contact not found'; END IF;
 IF recipient_key IS NOT NULL THEN
   RETURN public.record_marketing_consent(p_org,recipient_key,'revoked','baja_manual_pixy','Baja manual del contacto '||p_contact::text,now(),p_actor);
 END IF;
 -- Missing/malformed phone must never prevent a user from recording an opt-out.
 PERFORM 1 FROM public.marketing_campaigns WHERE organization_id=p_org AND id IN(
   SELECT campaign_id FROM public.marketing_enrollments WHERE organization_id=p_org AND contact_id=p_contact
 ) ORDER BY id FOR UPDATE;
 INSERT INTO public.marketing_consent_events(organization_id,contact_id,event,source,evidence,occurred_at,recorded_by)
 VALUES(p_org,p_contact,'revoked','baja_manual_pixy','Baja de contacto sin teléfono utilizable',now(),p_actor) RETURNING id INTO event_id;
 UPDATE public.leads SET marketing_opted_out=true,opted_out_at=now() WHERE id=p_contact AND organization_id=p_org;
 UPDATE public.marketing_enrollments SET status='cancelled',next_run_at=NULL,claim_token=NULL,claimed_until=NULL,
   last_error='Consentimiento revocado.' WHERE contact_id=p_contact AND organization_id=p_org AND status='active';
 RETURN event_id;
END $$;
REVOKE ALL ON FUNCTION public.revoke_marketing_contact(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_marketing_contact(uuid,uuid,uuid) TO service_role;

-- One SQL filter compiler for preview and future activation: no REST 1000-row truncation.
CREATE OR REPLACE FUNCTION public.marketing_audience_candidates(p_org uuid,p_filters jsonb)
RETURNS SETOF public.leads LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_filters IS NULL OR jsonb_typeof(p_filters) <> 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_filters) key
   WHERE key NOT IN ('status','source','assigned_to','has_phone','has_email','score_min','score_max','tags',
     'created_after','created_before','last_activity_after','last_activity_before')) THEN RAISE EXCEPTION 'Invalid audience filters'; END IF;
 RETURN QUERY SELECT l.* FROM public.leads l WHERE l.organization_id=p_org AND l.deleted_at IS NULL
 AND (nullif(p_filters->>'status','') IS NULL OR l.status=p_filters->>'status')
 AND (nullif(p_filters->>'source','') IS NULL OR l.source=p_filters->>'source')
 AND (nullif(p_filters->>'assigned_to','') IS NULL OR l.assigned_to=(p_filters->>'assigned_to')::uuid)
 AND (coalesce((p_filters->>'has_phone')::boolean,false)=false OR l.phone IS NOT NULL)
 AND (coalesce((p_filters->>'has_email')::boolean,false)=false OR l.email IS NOT NULL)
 AND (p_filters->>'score_min' IS NULL OR l.score >= (p_filters->>'score_min')::numeric)
 AND (p_filters->>'score_max' IS NULL OR l.score <= (p_filters->>'score_max')::numeric)
 AND (coalesce(jsonb_array_length(p_filters->'tags'),0)=0 OR l.tags && ARRAY(SELECT jsonb_array_elements_text(p_filters->'tags')))
 AND (p_filters->>'created_after' IS NULL OR l.created_at >= (p_filters->>'created_after')::timestamptz)
 AND (p_filters->>'created_before' IS NULL OR l.created_at <= (p_filters->>'created_before')::timestamptz)
 AND (p_filters->>'last_activity_after' IS NULL OR l.last_activity_at >= (p_filters->>'last_activity_after')::timestamptz)
 AND (p_filters->>'last_activity_before' IS NULL OR l.last_activity_at <= (p_filters->>'last_activity_before')::timestamptz);
END $$;
REVOKE ALL ON FUNCTION public.marketing_audience_candidates(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_audience_candidates(uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.marketing_audience_summary(p_org uuid,p_filters jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' AND NOT public.marketing_has_permission(p_org,'view') THEN
   RAISE EXCEPTION 'Marketing access denied'; END IF;
 WITH candidates AS MATERIALIZED (
   SELECT l.id,public.marketing_phone_key(l.phone) recipient FROM public.marketing_audience_candidates(p_org,p_filters) l
 ), classified AS (
   SELECT c.*,CASE WHEN c.recipient IS NULL THEN 'invalid_format'
     WHEN EXISTS(SELECT 1 FROM public.leads d WHERE d.organization_id=p_org AND d.deleted_at IS NULL
       AND public.marketing_phone_key(d.phone)=c.recipient AND d.marketing_opted_out IS TRUE) THEN 'opted_out'
     WHEN NOT public.marketing_recipient_allowed(p_org,c.recipient) THEN 'missing_consent'
     ELSE 'eligible' END reason FROM candidates c
 ) SELECT jsonb_build_object('matched',count(*),'eligible',count(DISTINCT recipient) FILTER(WHERE reason='eligible'),
   'duplicates',count(*) FILTER(WHERE reason='eligible')-count(DISTINCT recipient) FILTER(WHERE reason='eligible'),
   'invalidFormat',count(*) FILTER(WHERE reason='invalid_format'),'optedOut',count(*) FILTER(WHERE reason='opted_out'),
   'missingConsent',count(*) FILTER(WHERE reason='missing_consent')) INTO result FROM classified;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.marketing_audience_summary(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.marketing_audience_summary(uuid,jsonb) TO authenticated,service_role;

-- Only draft creation is exposed to sessions. RLS still applies to every insert.
CREATE OR REPLACE FUNCTION public.create_marketing_quick_draft(p_org uuid,p_name text,p_connection uuid,
 p_template uuid,p_content jsonb,p_filters jsonb,p_delivery jsonb)
RETURNS public.marketing_campaigns LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE camp public.marketing_campaigns; seq_id uuid; aud_id uuid; readiness jsonb;
BEGIN
 IF NOT public.marketing_has_permission(p_org,'manage') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 IF length(trim(p_name)) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Invalid campaign name'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.integration_connections WHERE id=p_connection AND organization_id=p_org
   AND status='active' AND provider_key IN('whatsapp_cloud','meta_whatsapp')) THEN RAISE EXCEPTION 'Invalid marketing channel'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.messaging_templates WHERE id=p_template AND organization_id=p_org
   AND channel_id=p_connection AND status='APPROVED' AND category='MARKETING' AND nullif(meta_id,'') IS NOT NULL
   AND name=p_content->>'template_name' AND language=p_content->>'template_language') THEN RAISE EXCEPTION 'Invalid marketing template'; END IF;
 readiness := public.marketing_audience_summary(p_org,p_filters);
 INSERT INTO public.marketing_audiences(organization_id,name,type,filter_config,cached_count,last_count_at,created_by)
 VALUES(p_org,trim(p_name)||' · destinatarios','dynamic',p_filters,(readiness->>'eligible')::integer,now(),auth.uid()) RETURNING id INTO aud_id;
 INSERT INTO public.marketing_campaigns(organization_id,name,goal,status,connection_id,audience_id,delivery_config,created_by)
 VALUES(p_org,trim(p_name),'broadcast','draft',p_connection,aud_id,p_delivery,auth.uid()) RETURNING * INTO camp;
 INSERT INTO public.marketing_sequences(organization_id,campaign_id,name,trigger_type,is_active)
 VALUES(p_org,camp.id,'Principal','manual',true) RETURNING id INTO seq_id;
 INSERT INTO public.marketing_steps(organization_id,sequence_id,type,name,order_index,content)
 VALUES(p_org,seq_id,'whatsapp','Mensaje de campaña',0,p_content);
 INSERT INTO public.broadcasts(organization_id,campaign_id,name,message,channel,filters,status,total_recipients)
 VALUES(p_org,camp.id,trim(p_name),'[Plantilla WhatsApp]','whatsapp',p_filters,'draft',0);
 RETURN camp;
END $$;
REVOKE ALL ON FUNCTION public.create_marketing_quick_draft(uuid,text,uuid,uuid,jsonb,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_marketing_quick_draft(uuid,text,uuid,uuid,jsonb,jsonb,jsonb) TO authenticated;

-- Parent campaign locking in the integrity trigger serializes all step writers.
CREATE OR REPLACE FUNCTION public.marketing_step_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.order_index IS DISTINCT FROM OLD.order_index THEN
   RAISE EXCEPTION 'Step ordering requires a dedicated reorder operation'; END IF;
 IF TG_OP='INSERT' THEN
   PERFORM 1 FROM public.marketing_campaigns WHERE id=(SELECT campaign_id FROM public.marketing_sequences WHERE id=NEW.sequence_id) FOR UPDATE;
   SELECT coalesce(max(order_index),-1)+1 INTO NEW.order_index FROM public.marketing_steps WHERE sequence_id=NEW.sequence_id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS marketing_steps_order ON public.marketing_steps;
CREATE TRIGGER marketing_steps_order BEFORE INSERT OR UPDATE ON public.marketing_steps
 FOR EACH ROW EXECUTE FUNCTION public.marketing_step_order();

CREATE OR REPLACE FUNCTION public.marketing_sequence_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM 1 FROM public.marketing_campaigns WHERE id=NEW.campaign_id FOR UPDATE;
 NEW.is_active := NOT EXISTS(SELECT 1 FROM public.marketing_sequences WHERE campaign_id=NEW.campaign_id AND is_active);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS marketing_sequences_principal ON public.marketing_sequences;
CREATE TRIGGER marketing_sequences_principal BEFORE INSERT ON public.marketing_sequences
 FOR EACH ROW EXECUTE FUNCTION public.marketing_sequence_default();

CREATE OR REPLACE FUNCTION public.set_marketing_principal(p_org uuid,p_campaign uuid,p_sequence uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.marketing_has_permission(p_org,'manage') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 PERFORM 1 FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org
   AND status='draft' AND execution_version IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Editable campaign not found'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.marketing_sequences WHERE id=p_sequence AND campaign_id=p_campaign AND organization_id=p_org) THEN
   RAISE EXCEPTION 'Invalid marketing sequence'; END IF;
 UPDATE public.marketing_sequences SET is_active=(id=p_sequence) WHERE campaign_id=p_campaign AND organization_id=p_org;
END $$;
REVOKE ALL ON FUNCTION public.set_marketing_principal(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_marketing_principal(uuid,uuid,uuid) TO authenticated;

-- Recheck recipient-level consent on both initial and recovered campaign sends.
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
 AND (c.scheduled_for IS NULL OR c.scheduled_for<=now()))
$$;
REVOKE ALL ON FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.read_marketing_preflight(p_org uuid,p_campaign uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE camp public.marketing_campaigns; filters jsonb; result jsonb;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' AND NOT public.marketing_has_permission(p_org,'view') THEN
   RAISE EXCEPTION 'Marketing access denied'; END IF;
 SELECT * INTO camp FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
 SELECT filter_config INTO filters FROM public.marketing_audiences WHERE id=camp.audience_id AND organization_id=p_org;
 SELECT jsonb_build_object('campaign',to_jsonb(camp),'audience',CASE WHEN filters IS NULL THEN NULL ELSE
   public.marketing_audience_summary(p_org,filters) END,
   'channel',(SELECT jsonb_build_object('id',id,'name',connection_name,'status',status,'provider',provider_key)
     FROM public.integration_connections WHERE id=camp.connection_id AND organization_id=p_org),
   'sequences',coalesce((SELECT jsonb_agg(to_jsonb(s)||jsonb_build_object('steps',coalesce((SELECT jsonb_agg(to_jsonb(st)
     ORDER BY st.order_index,st.id) FROM public.marketing_steps st WHERE st.sequence_id=s.id AND st.organization_id=p_org),'[]'::jsonb)))
     FROM public.marketing_sequences s WHERE s.campaign_id=camp.id AND s.organization_id=p_org),'[]'::jsonb),
   'templates',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'channel_id',channel_id,'name',name,'language',language,
     'status',status,'category',category,'meta_id',meta_id,'components',components)) FROM public.messaging_templates
     WHERE organization_id=p_org AND channel_id=camp.connection_id),'[]'::jsonb),
   'missingData',CASE WHEN filters IS NULL THEN 0 ELSE (SELECT count(DISTINCT public.marketing_phone_key(l.phone))
     FROM public.marketing_audience_candidates(p_org,filters) l
     WHERE public.marketing_recipient_allowed(p_org,public.marketing_phone_key(l.phone)) AND EXISTS(
       SELECT 1 FROM public.marketing_steps st JOIN public.marketing_sequences s ON s.id=st.sequence_id
       WHERE s.campaign_id=camp.id AND st.organization_id=p_org AND s.is_active AND (
         (coalesce(st.content->'bindings','{}'::jsonb)::text ~ '\{\{[[:space:]]*empresa[[:space:]]*\}\}' AND nullif(trim(l.company_name),'') IS NULL)
         OR (coalesce(st.content->'bindings','{}'::jsonb)::text ~ '\{\{[[:space:]]*nombre[[:space:]]*\}\}' AND nullif(trim(l.name),'') IS NULL)
       ))) END) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_preflight(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_preflight(uuid,uuid) TO authenticated,service_role;
COMMIT;
