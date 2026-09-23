BEGIN;
CREATE TABLE public.meta_oauth_sessions (
    state_hash text PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meta_oauth_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meta_oauth_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.meta_oauth_sessions TO service_role;
CREATE INDEX meta_oauth_sessions_expiry ON public.meta_oauth_sessions(expires_at);

-- Fail before changing ownership if existing installations contain ambiguous assets.
-- Resolve duplicates explicitly; never silently choose another tenant's connection.
CREATE UNIQUE INDEX integration_connections_meta_asset_owner
ON public.integration_connections (
    (CASE WHEN provider_key IN ('instagram_dm','instagram_dme') THEN 'instagram' ELSE provider_key END),
    (metadata->>'asset_id')
)
WHERE provider_key IN ('whatsapp_cloud','facebook_page','instagram_dm','instagram_dme')
AND status <> 'deleted' AND nullif(metadata->>'asset_id','') IS NOT NULL;
COMMIT;
