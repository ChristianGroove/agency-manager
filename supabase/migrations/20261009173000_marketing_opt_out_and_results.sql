-- New live requests only. No historical Inbox rewrite and no outbound messages.
BEGIN;
CREATE OR REPLACE FUNCTION public.marketing_opt_out_rule(p_button text,p_text text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE normalized text;
BEGIN
 IF upper(trim(coalesce(p_button,'')))='BAJA_PROMOCIONES' THEN RETURN 'button'; END IF;
 normalized:=translate(lower(trim(coalesce(p_text,''))),'áéíóúüñ','aeiouun');
 normalized:=regexp_replace(normalized,'[[:space:]]+',' ','g');
 normalized:=regexp_replace(normalized,'^[¿¡[:space:]]+|[!?.,;:[:space:]]+$','','g');
 IF normalized IN ('stop','unsubscribe','baja','baja_promociones','stop marketing messages',
  'unsubscribe from marketing','no quiero recibir promociones','no quiero recibir mas promociones',
  'no me envien mas promociones','dejen de enviarme promociones','quiero darme de baja',
  'quiero darme de baja de las promociones') THEN RETURN 'explicit_text'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.marketing_opt_out_rule(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_opt_out_rule(text,text) TO service_role;

CREATE TABLE IF NOT EXISTS public.marketing_opt_out_receipts(
 message_id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 recipient text NOT NULL,
 rule text NOT NULL CHECK(rule IN ('button','explicit_text')),
 consent_event_id bigint REFERENCES public.marketing_consent_events(id),
 processed_at timestamptz,
 attempts integer NOT NULL DEFAULT 0,
 retry_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.marketing_opt_out_receipts DROP CONSTRAINT IF EXISTS marketing_opt_out_receipts_message_id_fkey;
ALTER TABLE public.marketing_opt_out_receipts
 ALTER COLUMN consent_event_id DROP NOT NULL,
 ALTER COLUMN processed_at DROP NOT NULL,
 ALTER COLUMN processed_at DROP DEFAULT,
 ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS retry_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS marketing_pending_opt_outs ON public.marketing_opt_out_receipts(retry_at,organization_id,recipient)
 WHERE processed_at IS NULL;
-- A deleted Inbox message must not undo a pending withdrawal.
CREATE INDEX IF NOT EXISTS marketing_pending_opt_out_recipient ON public.marketing_opt_out_receipts(organization_id,recipient)
 WHERE processed_at IS NULL;
ALTER TABLE public.marketing_opt_out_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_opt_out_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.marketing_opt_out_receipts TO service_role,authenticated;
DROP POLICY IF EXISTS marketing_receipts_read ON public.marketing_opt_out_receipts;
CREATE POLICY marketing_receipts_read ON public.marketing_opt_out_receipts FOR SELECT TO authenticated
 USING(public.marketing_has_permission(organization_id,'view'));

CREATE OR REPLACE FUNCTION public.marketing_capture_incoming_opt_out()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE rule text; recipient_key text; sender_key text;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' OR NEW.external_id IS NULL
 OR NEW.direction<>'inbound' OR NEW.channel<>'whatsapp' OR NEW.metadata->>'origin'='outbound'
 OR NEW.metadata->>'is_echo'='true' OR NEW.metadata->'metadata'->>'historical'='true' THEN RETURN NEW; END IF;
 rule:=public.marketing_opt_out_rule(coalesce(NEW.metadata->>'buttonId',NEW.content->'raw'->'button_reply'->>'id',NEW.content->'raw'->'button'->>'payload'),
  CASE WHEN jsonb_typeof(NEW.content)='string' THEN NEW.content#>>'{}' ELSE NEW.content->>'text' END);
 IF rule IS NULL THEN RETURN NEW; END IF;
 -- Resolve exclusively through the persisted, tenant-owned WhatsApp conversation and its lead.
 SELECT public.marketing_phone_key(c.phone) INTO recipient_key FROM public.conversations c
 JOIN public.integration_connections i ON i.id=c.connection_id AND i.organization_id=c.organization_id
 JOIN public.leads l ON l.id=c.lead_id AND l.organization_id=c.organization_id AND l.deleted_at IS NULL
 WHERE c.id=NEW.conversation_id AND c.organization_id=NEW.organization_id AND c.channel='whatsapp'
  AND i.provider_key IN ('whatsapp_cloud','meta_whatsapp')
  AND public.marketing_phone_key(l.phone)=public.marketing_phone_key(c.phone);
 sender_key:=public.marketing_phone_key(NEW.metadata->>'from');
 IF recipient_key IS NULL OR sender_key IS DISTINCT FROM recipient_key THEN
  RAISE EXCEPTION 'Marketing opt-out sender context unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.marketing_opt_out_receipts WHERE message_id=NEW.id) THEN RETURN NEW; END IF;
 INSERT INTO public.marketing_opt_out_receipts(message_id,organization_id,recipient,rule)
 VALUES(NEW.id,NEW.organization_id,recipient_key,rule);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.marketing_capture_incoming_opt_out() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS marketing_incoming_opt_out ON public.messages;
CREATE TRIGGER marketing_incoming_opt_out AFTER INSERT ON public.messages FOR EACH ROW
 WHEN(NEW.channel='whatsapp' AND NEW.direction='inbound') EXECUTE FUNCTION public.marketing_capture_incoming_opt_out();

CREATE OR REPLACE FUNCTION public.marketing_recipient_allowed(p_org uuid,p_recipient text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p_recipient IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM public.marketing_opt_out_receipts WHERE organization_id=p_org AND recipient=p_recipient AND processed_at IS NULL) AND coalesce((SELECT event='granted' FROM public.marketing_consent_events
 WHERE organization_id=p_org AND recipient=p_recipient ORDER BY id DESC LIMIT 1),false)
 AND NOT EXISTS(SELECT 1 FROM public.leads WHERE organization_id=p_org AND deleted_at IS NULL
 AND public.marketing_phone_key(phone)=p_recipient AND marketing_opted_out IS TRUE)
$$;
REVOKE ALL ON FUNCTION public.marketing_recipient_allowed(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_recipient_allowed(uuid,text) TO service_role;

-- Append-only evidence. Granting does not undo an existing opt-out.
CREATE OR REPLACE FUNCTION public.process_marketing_opt_out_requests(p_limit integer DEFAULT 5,p_message uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='2s' AS $$
DECLARE request record; event_id bigint; processed integer:=0; failed integer:=0;
BEGIN
 FOR request IN SELECT * FROM public.marketing_opt_out_receipts WHERE processed_at IS NULL
  AND retry_at<=clock_timestamp() AND (p_message IS NULL OR message_id=p_message)
  ORDER BY retry_at,message_id LIMIT greatest(1,least(p_limit,25)) FOR UPDATE SKIP LOCKED LOOP
  BEGIN
   event_id:=public.record_marketing_consent(request.organization_id,request.recipient,'revoked','whatsapp_inbound',
    'Solicitud de baja; mensaje '||request.message_id::text||'; regla '||request.rule,
    clock_timestamp(),NULL);
   UPDATE public.marketing_opt_out_receipts SET processed_at=clock_timestamp(),consent_event_id=event_id,
    attempts=attempts+1 WHERE message_id=request.message_id;
   processed:=processed+1;
  EXCEPTION WHEN OTHERS THEN
   UPDATE public.marketing_opt_out_receipts SET attempts=attempts+1,retry_at=clock_timestamp()+interval '5 minutes'
    WHERE message_id=request.message_id;
   failed:=failed+1;
  END;
 END LOOP;
 RETURN jsonb_build_object('processed',processed,'failed',failed);
END $$;
REVOKE ALL ON FUNCTION public.process_marketing_opt_out_requests(integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_marketing_opt_out_requests(integer,uuid) TO service_role;

-- Stable operation-key mapping, scoped to organization and campaign connection.
CREATE INDEX IF NOT EXISTS marketing_outbox_enrollment ON public.meta_outbound_outbox
 (organization_id,(split_part(operation_key,':',2))) WHERE operation_key LIKE 'campaign:%';
CREATE OR REPLACE FUNCTION public.read_marketing_campaign_metrics(p_org uuid,p_campaign uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' AND NOT public.marketing_has_permission(p_org,'view') THEN
  RAISE EXCEPTION 'Marketing access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org) THEN
  RAISE EXCEPTION 'Campaign not found'; END IF;
 WITH enrollments AS (SELECT * FROM public.marketing_enrollments WHERE organization_id=p_org AND campaign_id=p_campaign),
 deliveries AS (SELECT o.status,m.status receipt FROM public.meta_outbound_outbox o JOIN enrollments e
  ON split_part(o.operation_key,':',2)=e.id::text AND o.organization_id=e.organization_id
  JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.connection_id=o.connection_id
  LEFT JOIN public.messages m ON m.id=o.message_id AND m.organization_id=p_org WHERE o.operation_key LIKE 'campaign:%')
 SELECT jsonb_build_object('stats',(SELECT jsonb_build_object('total',count(*),
  'active',count(*) FILTER(WHERE status='active'),'completed',count(*) FILTER(WHERE status='completed'),
  'failed',count(*) FILTER(WHERE status='failed'),'cancelled',count(*) FILTER(WHERE status='cancelled')) FROM enrollments),
  'delivery',(SELECT jsonb_build_object('queued',count(*) FILTER(WHERE status='queued'),
  'sending',count(*) FILTER(WHERE status='sending'),'accepted',count(*) FILTER(WHERE status='accepted'),
  'delivered',count(*) FILTER(WHERE status='accepted' AND receipt IN ('delivered','read')),
  'read',count(*) FILTER(WHERE status='accepted' AND receipt='read'),
  'failed',count(*) FILTER(WHERE status='failed' OR receipt='failed'),'unknown',count(*) FILTER(WHERE status='unknown')) FROM deliveries),
  'recentActivity',coalesce((SELECT jsonb_agg(to_jsonb(activity) ORDER BY last_updated DESC NULLS LAST,id) FROM (
   SELECT e.id,e.status,coalesce(e.last_run_at,e.started_at) last_updated,e.last_error,
    jsonb_build_object('name',coalesce(e.recipient_snapshot->>'name',l.name),
     'phone',coalesce(e.recipient,l.phone)) lead,
    CASE WHEN jsonb_typeof(e.execution_logs)='array' THEN e.execution_logs->-1 ELSE NULL END last_log
   FROM enrollments e LEFT JOIN public.leads l ON l.id=e.contact_id AND l.organization_id=p_org
   ORDER BY coalesce(e.last_run_at,e.started_at) DESC NULLS LAST,e.id LIMIT 10) activity),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_campaign_metrics(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_campaign_metrics(uuid,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.finalize_marketing_campaigns(p_limit integer DEFAULT 25)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE camp record; closed integer:=0;
BEGIN
 FOR camp IN SELECT c.id,c.organization_id,c.connection_id FROM public.marketing_campaigns c
  WHERE c.execution_version=2 AND c.status='active'
   AND EXISTS(SELECT 1 FROM public.marketing_enrollments WHERE campaign_id=c.id AND organization_id=c.organization_id)
   AND NOT EXISTS(SELECT 1 FROM public.marketing_enrollments WHERE campaign_id=c.id AND organization_id=c.organization_id AND status='active')
   AND NOT EXISTS(SELECT 1 FROM public.meta_outbound_outbox o JOIN public.marketing_enrollments e
    ON split_part(o.operation_key,':',2)=e.id::text AND o.organization_id=e.organization_id
    WHERE e.campaign_id=c.id AND e.organization_id=c.organization_id AND o.connection_id=c.connection_id
     AND o.operation_key LIKE 'campaign:%' AND (o.status IN ('sending','unknown')
      OR (o.status='queued' AND e.status NOT IN ('cancelled','failed'))))
  ORDER BY c.id LIMIT greatest(1,least(p_limit,25)) FOR UPDATE OF c SKIP LOCKED LOOP
  -- Cancel unclaimed operations whose recipient already reached a terminal state.
  WITH cancelled AS (UPDATE public.meta_outbound_outbox o SET status='failed',error_kind='marketing_recipient_terminal',
   updated_at=clock_timestamp() FROM public.marketing_enrollments e
   WHERE e.campaign_id=camp.id AND e.organization_id=camp.organization_id AND e.status IN ('cancelled','failed')
    AND o.organization_id=camp.organization_id AND o.connection_id=camp.connection_id AND o.status='queued'
    AND o.operation_key LIKE 'campaign:%' AND split_part(o.operation_key,':',2)=e.id::text RETURNING o.message_id)
  UPDATE public.messages SET status='failed' WHERE id IN(SELECT message_id FROM cancelled)
   AND organization_id=camp.organization_id AND external_id IS NULL AND status='sending';
  IF NOT EXISTS(SELECT 1 FROM public.meta_outbound_outbox o JOIN public.marketing_enrollments e
   ON split_part(o.operation_key,':',2)=e.id::text AND o.organization_id=e.organization_id
   WHERE e.campaign_id=camp.id AND e.organization_id=camp.organization_id AND o.connection_id=camp.connection_id
    AND o.operation_key LIKE 'campaign:%' AND o.status IN ('queued','sending','unknown')) THEN
   UPDATE public.marketing_campaigns SET status='completed' WHERE id=camp.id AND organization_id=camp.organization_id;
   closed:=closed+1;
  END IF;
 END LOOP;
 RETURN closed;
END $$;
REVOKE ALL ON FUNCTION public.finalize_marketing_campaigns(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_marketing_campaigns(integer) TO service_role;
COMMIT;
