-- Marketing-only authorization and execution controls. No CRM/Inbox data rewrite.
BEGIN;

CREATE OR REPLACE FUNCTION public.marketing_has_permission(p_org uuid, p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.organization_members m
   LEFT JOIN public.organization_roles r ON r.id=m.role_id AND r.organization_id=m.organization_id
   WHERE m.organization_id=p_org AND m.user_id=auth.uid()
     AND m.deleted_at IS NULL AND coalesce(m.status,'active') <> 'blocked'
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

-- Replace permissive legacy membership policies; permissions are also checked in actions.
DO $$ DECLARE tab text; pol record; BEGIN
 FOREACH tab IN ARRAY ARRAY['marketing_campaigns','marketing_sequences','marketing_steps','marketing_audiences','marketing_enrollments','broadcasts'] LOOP
   FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tab LOOP
     EXECUTE format('DROP POLICY %I ON public.%I',pol.policyname,tab);
   END LOOP;
   EXECUTE format('CREATE POLICY marketing_read ON public.%I FOR SELECT TO authenticated USING (public.marketing_has_permission(organization_id,''view''))',tab);
   IF tab <> 'marketing_enrollments' THEN
     EXECUTE format('CREATE POLICY marketing_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.marketing_has_permission(organization_id,''manage''))',tab);
     EXECUTE format('CREATE POLICY marketing_update ON public.%I FOR UPDATE TO authenticated USING (public.marketing_has_permission(organization_id,''manage'')) WITH CHECK (public.marketing_has_permission(organization_id,''manage''))',tab);
     EXECUTE format('CREATE POLICY marketing_delete ON public.%I FOR DELETE TO authenticated USING (public.marketing_has_permission(organization_id,''manage''))',tab);
   END IF;
 END LOOP;
END $$;

ALTER TABLE public.marketing_campaigns
 ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.integration_connections(id),
 ADD COLUMN IF NOT EXISTS execution_version integer,
 ADD COLUMN IF NOT EXISTS paused_reason text,
 ADD COLUMN IF NOT EXISTS execution_snapshot jsonb;
ALTER TABLE public.marketing_enrollments
 ADD COLUMN IF NOT EXISTS claim_token uuid,
 ADD COLUMN IF NOT EXISTS claimed_until timestamptz,
 ADD COLUMN IF NOT EXISTS recipient text;
-- Draft deletion should remove its private design, not leave orphan sequences.
ALTER TABLE public.marketing_sequences DROP CONSTRAINT IF EXISTS marketing_sequences_campaign_id_fkey;
ALTER TABLE public.marketing_sequences ADD CONSTRAINT marketing_sequences_campaign_id_fkey
 FOREIGN KEY(campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS marketing_campaign_recipient_unique
 ON public.marketing_enrollments(campaign_id,recipient) WHERE recipient IS NOT NULL;
CREATE INDEX IF NOT EXISTS marketing_ready_claims
 ON public.marketing_enrollments(next_run_at,campaign_id) WHERE status='active';

-- Lock the campaign when mutating child rows. Activation and editing cannot race.
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
   SELECT * INTO camp FROM public.marketing_campaigns WHERE id=(row_data->>'campaign_id')::uuid FOR UPDATE;
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
DROP TRIGGER IF EXISTS marketing_steps_integrity ON public.marketing_steps;
CREATE TRIGGER marketing_steps_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.marketing_steps
 FOR EACH ROW EXECUTE FUNCTION public.marketing_check_integrity();
DROP TRIGGER IF EXISTS marketing_sequences_integrity ON public.marketing_sequences;
CREATE TRIGGER marketing_sequences_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.marketing_sequences
 FOR EACH ROW EXECUTE FUNCTION public.marketing_check_integrity();
DROP TRIGGER IF EXISTS marketing_enrollments_integrity ON public.marketing_enrollments;
CREATE TRIGGER marketing_enrollments_integrity BEFORE INSERT OR UPDATE ON public.marketing_enrollments
 FOR EACH ROW EXECUTE FUNCTION public.marketing_check_integrity();

CREATE OR REPLACE FUNCTION public.marketing_campaign_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.connection_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.integration_connections WHERE id=NEW.connection_id AND organization_id=NEW.organization_id
     AND provider_key IN ('whatsapp_cloud','meta_whatsapp')
 ) THEN RAISE EXCEPTION 'Invalid marketing channel'; END IF;
 IF NEW.audience_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.marketing_audiences WHERE id=NEW.audience_id AND organization_id=NEW.organization_id
 ) THEN RAISE EXCEPTION 'Invalid marketing audience'; END IF;
 IF TG_OP='UPDATE' THEN
   IF NEW.organization_id <> OLD.organization_id THEN RAISE EXCEPTION 'Marketing organization is immutable'; END IF;
   IF OLD.execution_version IS NOT NULL AND (
     NEW.connection_id IS DISTINCT FROM OLD.connection_id OR NEW.audience_id IS DISTINCT FROM OLD.audience_id
     OR NEW.delivery_config IS DISTINCT FROM OLD.delivery_config OR NEW.scheduled_for IS DISTINCT FROM OLD.scheduled_for
     OR NEW.execution_snapshot IS DISTINCT FROM OLD.execution_snapshot
   ) THEN RAISE EXCEPTION 'Campaign execution is immutable'; END IF;
 END IF;
 -- Session callers may save drafts, but cannot bypass server activation validation.
 IF coalesce(auth.role(),'') <> 'service_role' AND (NEW.status <> 'draft' OR NEW.execution_version IS NOT NULL) THEN
   RAISE EXCEPTION 'Use the authorized marketing control action';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS marketing_campaign_guard ON public.marketing_campaigns;
CREATE TRIGGER marketing_campaign_guard BEFORE INSERT OR UPDATE ON public.marketing_campaigns
 FOR EACH ROW EXECUTE FUNCTION public.marketing_campaign_guard();

CREATE OR REPLACE FUNCTION public.marketing_campaign_delete_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id=OLD.organization_id) THEN RETURN OLD; END IF;
 IF OLD.status <> 'draft' OR OLD.execution_version IS NOT NULL THEN
   RAISE EXCEPTION 'Only draft campaigns can be deleted; archive executed campaigns';
 END IF;
 RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS marketing_campaign_delete_guard ON public.marketing_campaigns;
CREATE TRIGGER marketing_campaign_delete_guard BEFORE DELETE ON public.marketing_campaigns
 FOR EACH ROW EXECUTE FUNCTION public.marketing_campaign_delete_guard();

-- Claims are internal only. Legacy enrollments are not silently activated by this migration.
CREATE OR REPLACE FUNCTION public.claim_marketing_enrollments(p_limit integer DEFAULT 25)
RETURNS SETOF public.marketing_enrollments LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH candidates AS (
   SELECT e.id FROM public.marketing_enrollments e
   JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=e.organization_id
   WHERE e.status='active' AND c.status='active' AND c.execution_version=2 AND c.connection_id IS NOT NULL
     AND e.next_run_at <= now() AND (c.scheduled_for IS NULL OR c.scheduled_for <= now())
     AND (e.claimed_until IS NULL OR e.claimed_until < now())
   ORDER BY e.next_run_at,e.id LIMIT greatest(1,least(p_limit,25)) FOR UPDATE OF e SKIP LOCKED
 ) UPDATE public.marketing_enrollments e SET claim_token=gen_random_uuid(),claimed_until=now()+interval '90 seconds'
 FROM candidates c WHERE e.id=c.id RETURNING e.*;
$$;
REVOKE ALL ON FUNCTION public.claim_marketing_enrollments(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketing_enrollments(integer) TO service_role;

-- This final check also applies to recovery of already queued campaign operations.
-- A request already accepted by Meta cannot be recalled by pausing the campaign.
CREATE OR REPLACE FUNCTION public.marketing_outbound_allowed(p_org uuid,p_connection uuid,p_operation text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.marketing_enrollments e
   JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=e.organization_id
   JOIN public.marketing_steps s ON s.id=e.current_step_id AND s.sequence_id=e.sequence_id AND s.organization_id=e.organization_id
   JOIN public.leads l ON l.id=e.contact_id AND l.organization_id=e.organization_id
   WHERE e.organization_id=p_org AND c.connection_id=p_connection AND c.status='active' AND e.status='active'
     AND c.execution_version=2 AND NOT coalesce(l.marketing_opted_out,false)
     AND p_operation='campaign:'||e.id::text||':'||s.id::text
     AND (c.scheduled_for IS NULL OR c.scheduled_for<=now())
 );
$$;
REVOKE ALL ON FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_outbound_allowed(uuid,uuid,text) TO service_role;
COMMIT;
