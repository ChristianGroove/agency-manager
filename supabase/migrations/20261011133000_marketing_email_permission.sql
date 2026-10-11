BEGIN;
CREATE FUNCTION public.record_marketing_email_permission(p_org uuid,p_actor uuid,p_email text,p_reference text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') OR public.marketing_email_key(p_email) IS DISTINCT FROM p_email OR p_email IS NULL OR p_reference IS NULL OR length(p_reference) NOT BETWEEN 1 AND 2400 THEN RAISE EXCEPTION 'Invalid email permission'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('email:'||p_org::text||':'||p_email,0));
 IF NOT EXISTS(SELECT 1 FROM public.leads WHERE organization_id=p_org AND deleted_at IS NULL AND public.marketing_email_key(email)=p_email) THEN RAISE EXCEPTION 'Contact unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.marketing_email_permissions WHERE organization_id=p_org AND recipient=p_email AND revoked_at IS NOT NULL) THEN RAISE EXCEPTION 'Unsubscribed contact'; END IF;
 INSERT INTO public.marketing_email_permissions(organization_id,recipient,granted_at,actor,reference) VALUES(p_org,p_email,clock_timestamp(),p_actor,p_reference) ON CONFLICT(organization_id,recipient) DO NOTHING;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_marketing_email_permission(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_marketing_email_permission(uuid,uuid,text,text) TO service_role;
CREATE TABLE public.marketing_email_permission_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 recipient text NOT NULL, granted_at timestamptz, revoked_at timestamptz, actor uuid, reference text, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX marketing_email_permission_events_contact ON public.marketing_email_permission_events(organization_id,recipient,recorded_at DESC);
ALTER TABLE public.marketing_email_permission_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_email_permission_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.marketing_email_permission_events TO service_role;
CREATE FUNCTION public.audit_marketing_email_permission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 INSERT INTO public.marketing_email_permission_events(organization_id,recipient,granted_at,revoked_at,actor,reference) VALUES(NEW.organization_id,NEW.recipient,NEW.granted_at,NEW.revoked_at,NEW.actor,NEW.reference);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.audit_marketing_email_permission() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER marketing_email_permission_audit AFTER INSERT OR UPDATE ON public.marketing_email_permissions FOR EACH ROW EXECUTE FUNCTION public.audit_marketing_email_permission();
COMMIT;
