-- Only for a disposable database. These stand-ins model the auth functions used by the migrations.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
-- Only for an empty disposable Supabase Postgres instance, never a deployed database.
CREATE TABLE public.organizations(id uuid PRIMARY KEY);
CREATE TABLE public.organization_members(organization_id uuid REFERENCES public.organizations,user_id uuid,role text);
CREATE TABLE public.integration_connections(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid REFERENCES public.organizations,provider_key text,status text,credentials jsonb,metadata jsonb);
CREATE TABLE public.conversations(id uuid PRIMARY KEY,organization_id uuid REFERENCES public.organizations,connection_id uuid REFERENCES public.integration_connections);
CREATE TABLE public.messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid REFERENCES public.conversations,organization_id uuid,external_id text,status text);
INSERT INTO public.organizations VALUES ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
INSERT INTO public.integration_connections(id,organization_id,provider_key,status,credentials,metadata) VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','whatsapp_cloud','active','{"access_token":"legacy-test-token"}','{"asset_id":"phone1"}');
