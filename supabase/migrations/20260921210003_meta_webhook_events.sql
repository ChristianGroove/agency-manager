BEGIN;
CREATE TABLE public.meta_webhook_events (
 id text PRIMARY KEY, payload jsonb NOT NULL, channel text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
ALTER TABLE public.meta_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meta_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.meta_webhook_events TO service_role;
CREATE INDEX meta_webhook_events_pending ON public.meta_webhook_events(created_at) WHERE processed_at IS NULL;

CREATE TABLE public.meta_message_statuses (
 connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 external_id text NOT NULL, status text NOT NULL, event_timestamp timestamptz NOT NULL,
 pricing jsonb, error_codes jsonb, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(connection_id, external_id)
);
ALTER TABLE public.meta_message_statuses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meta_message_statuses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.meta_message_statuses TO authenticated;
GRANT ALL ON public.meta_message_statuses TO service_role;
CREATE POLICY meta_message_statuses_members ON public.meta_message_statuses FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id=auth.uid()));

CREATE TABLE public.meta_app_contacts (
 connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
 phone_number text NOT NULL, contact jsonb NOT NULL, removed boolean NOT NULL DEFAULT false,
 event_timestamp timestamptz NOT NULL, PRIMARY KEY(connection_id,phone_number)
);
ALTER TABLE public.meta_app_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meta_app_contacts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.meta_app_contacts TO service_role;

CREATE FUNCTION public.set_meta_connection_metadata(p_connection_id uuid,p_organization_id uuid,p_patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT EXISTS (
  SELECT 1 FROM public.organization_members WHERE user_id=auth.uid() AND organization_id=p_organization_id AND role IN ('owner','admin')
 ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF p_patch->>'history_sync_status' = 'receiving' AND EXISTS (
  SELECT 1 FROM public.integration_connections WHERE id=p_connection_id AND organization_id=p_organization_id AND metadata->>'history_sync_status' IN ('complete','not_shared')
 ) THEN p_patch:=p_patch-'history_sync_status'; END IF;
 UPDATE public.integration_connections SET metadata=coalesce(metadata,'{}'::jsonb)||p_patch
 WHERE id=p_connection_id AND organization_id=p_organization_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Connection not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_meta_connection_metadata(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_meta_connection_metadata(uuid,uuid,jsonb) TO authenticated,service_role;

CREATE FUNCTION public.record_meta_message_status(p_connection_id uuid,p_status jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE org uuid; resolved_status text; stamp timestamptz;
BEGIN
 SELECT organization_id INTO STRICT org FROM public.integration_connections WHERE id=p_connection_id AND status IN ('active','connected');
 IF p_status->>'status' NOT IN ('sent','delivered','read','failed') THEN RETURN; END IF;
 stamp := to_timestamp((p_status->>'timestamp')::double precision);
 INSERT INTO public.meta_message_statuses AS old (connection_id,organization_id,external_id,status,event_timestamp,pricing,error_codes)
 VALUES(p_connection_id,org,p_status->>'id',p_status->>'status',stamp,p_status->'pricing',p_status->'errors')
 ON CONFLICT(connection_id,external_id) DO UPDATE SET
 status=CASE WHEN old.status='read' THEN old.status
 WHEN old.status='delivered' AND EXCLUDED.status IN ('sent','failed') THEN old.status
 WHEN old.status='failed' AND EXCLUDED.status='sent' THEN old.status ELSE EXCLUDED.status END,
 event_timestamp=greatest(old.event_timestamp,EXCLUDED.event_timestamp),
 pricing=coalesce(EXCLUDED.pricing,old.pricing),error_codes=coalesce(EXCLUDED.error_codes,old.error_codes),updated_at=now()
 RETURNING status INTO resolved_status;
 UPDATE public.messages m SET status=resolved_status
 FROM public.conversations c WHERE m.conversation_id=c.id AND c.organization_id=org
 AND c.connection_id=p_connection_id AND m.external_id=p_status->>'id';
END $$;
REVOKE ALL ON FUNCTION public.record_meta_message_status(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_meta_message_status(uuid,jsonb) TO service_role;
-- Reserve before the external call: ambiguous network failures must not repeat the one-time history request.
CREATE FUNCTION public.claim_meta_history_request(p_connection_id uuid,p_organization_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT EXISTS (
  SELECT 1 FROM public.organization_members WHERE user_id=auth.uid() AND organization_id=p_organization_id AND role IN ('owner','admin')
 ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 UPDATE public.integration_connections SET metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('history_sync_requested_at',now())
 WHERE id=p_connection_id AND organization_id=p_organization_id AND NOT (coalesce(metadata,'{}'::jsonb) ? 'history_sync_requested_at');
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_meta_history_request(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_meta_history_request(uuid,uuid) TO authenticated,service_role;

-- Reconcile a status that arrived before the sender saved Meta's external message ID.
CREATE FUNCTION public.apply_existing_meta_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE resolved text;
BEGIN
 SELECT s.status INTO resolved FROM public.meta_message_statuses s JOIN public.conversations c
 ON c.connection_id=s.connection_id AND c.organization_id=s.organization_id
 WHERE c.id=NEW.conversation_id AND s.external_id=NEW.external_id;
 IF FOUND THEN NEW.status:=resolved; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.apply_existing_meta_status() FROM PUBLIC;
CREATE TRIGGER apply_existing_meta_status BEFORE INSERT OR UPDATE OF external_id,status ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.apply_existing_meta_status();
COMMIT;
