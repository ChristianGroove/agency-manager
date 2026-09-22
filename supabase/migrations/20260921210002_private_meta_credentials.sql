BEGIN;
CREATE TABLE public.integration_connection_secrets (
    connection_id uuid PRIMARY KEY REFERENCES public.integration_connections(id) ON DELETE CASCADE,
    credentials jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_connection_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_connection_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.integration_connection_secrets TO service_role;

-- Move legacy secrets out of the public connection row transactionally.
INSERT INTO public.integration_connection_secrets(connection_id, credentials)
SELECT id, credentials FROM public.integration_connections
WHERE provider_key IN ('whatsapp_cloud','meta_whatsapp','meta_business','facebook_page','instagram_dm','instagram_dme','meta_ads_monitor')
AND status <> 'deleted' AND credentials IS NOT NULL AND credentials <> '{}'::jsonb;
UPDATE public.integration_connections c SET credentials = jsonb_build_object('_private', c.id)
WHERE EXISTS (SELECT 1 FROM public.integration_connection_secrets s WHERE s.connection_id = c.id);
UPDATE public.integration_connections SET credentials = '{}'::jsonb
WHERE status = 'deleted' AND provider_key IN ('whatsapp_cloud','meta_whatsapp','meta_business','facebook_page','instagram_dm','instagram_dme','meta_ads_monitor');

CREATE FUNCTION public.protect_meta_connection_credentials() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NEW.provider_key NOT IN ('whatsapp_cloud','meta_whatsapp','meta_business','facebook_page','instagram_dm','instagram_dme','meta_ads_monitor') THEN RETURN NEW; END IF;
    IF NEW.status = 'deleted' THEN
        DELETE FROM public.integration_connection_secrets WHERE connection_id = NEW.id;
        NEW.credentials := '{}'::jsonb;
    ELSIF NEW.credentials ? '_private' THEN
        IF NEW.credentials->>'_private' IS DISTINCT FROM NEW.id::text THEN RAISE EXCEPTION 'Invalid credential reference'; END IF;
    ELSIF NEW.credentials IS NOT NULL AND NEW.credentials <> '{}'::jsonb THEN
        IF NOT (NEW.credentials ? '_encrypted') THEN RAISE EXCEPTION 'Meta credentials must be encrypted by the server'; END IF;
        INSERT INTO public.integration_connection_secrets(connection_id, credentials)
        VALUES (NEW.id, NEW.credentials)
        ON CONFLICT (connection_id) DO UPDATE SET credentials = EXCLUDED.credentials, updated_at = now();
        NEW.credentials := jsonb_build_object('_private', NEW.id);
    END IF;
    RETURN NEW;
END $$;
-- The deferred FK permits BEFORE INSERT to store the secret atomically.
ALTER TABLE public.integration_connection_secrets DROP CONSTRAINT integration_connection_secrets_connection_id_fkey;
ALTER TABLE public.integration_connection_secrets ADD CONSTRAINT integration_connection_secrets_connection_id_fkey
FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
REVOKE ALL ON FUNCTION public.protect_meta_connection_credentials() FROM PUBLIC;
CREATE TRIGGER protect_meta_connection_credentials BEFORE INSERT OR UPDATE ON public.integration_connections
FOR EACH ROW EXECUTE FUNCTION public.protect_meta_connection_credentials();
COMMIT;
