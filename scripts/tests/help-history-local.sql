-- Run ONLY against local supabase_db_agency-manager. Fixtures always roll back.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.organizations(id,name,slug) VALUES
 ('81111111-1111-4111-8111-111111111111','History test A','history-rls-test-a'),
 ('82222222-2222-4222-8222-222222222222','History test B','history-rls-test-b');
INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES
 ('81111111-1111-4111-8111-111111111111','e608329a-39fb-47ab-a759-20624dbd5b5e','member','active');
INSERT INTO public.help_chat_threads(id,organization_id,user_id,title) VALUES
 ('83333333-3333-4333-8333-333333333333','81111111-1111-4111-8111-111111111111','c3b2058f-487c-442f-a9a0-c1c7d3fb0883','Admin private'),
 ('84444444-4444-4444-8444-444444444444','81111111-1111-4111-8111-111111111111','e608329a-39fb-47ab-a759-20624dbd5b5e','Member private');
INSERT INTO public.help_chat_messages(thread_id,role,content) VALUES
 ('83333333-3333-4333-8333-333333333333','user','Private admin question'),
 ('84444444-4444-4444-8444-444444444444','user','Private member question');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c3b2058f-487c-442f-a9a0-c1c7d3fb0883',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.help_chat_threads WHERE id IN ('83333333-3333-4333-8333-333333333333','84444444-4444-4444-8444-444444444444')) <> 1 THEN RAISE EXCEPTION 'Super admin sees another user history'; END IF;
 IF EXISTS (SELECT 1 FROM public.help_chat_messages WHERE thread_id = '84444444-4444-4444-8444-444444444444') THEN RAISE EXCEPTION 'Super admin sees private messages'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','e608329a-39fb-47ab-a759-20624dbd5b5e',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.help_chat_threads WHERE id IN ('83333333-3333-4333-8333-333333333333','84444444-4444-4444-8444-444444444444')) <> 1 THEN RAISE EXCEPTION 'Member isolation failed'; END IF;
 BEGIN
  INSERT INTO public.help_chat_threads(organization_id,title) VALUES ('82222222-2222-4222-8222-222222222222','Unauthorized tenant');
  RAISE EXCEPTION 'Cross-tenant insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.help_chat_messages(thread_id,role,content) VALUES ('83333333-3333-4333-8333-333333333333','assistant','Unauthorized write');
  RAISE EXCEPTION 'Another user message insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.help_chat_threads(organization_id,user_id,title) VALUES ('81111111-1111-4111-8111-111111111111','c3b2058f-487c-442f-a9a0-c1c7d3fb0883','Forged owner');
  RAISE EXCEPTION 'Owner spoofing allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
INSERT INTO public.help_chat_messages(thread_id,role,content)
 SELECT '84444444-4444-4444-8444-444444444444','assistant','Bounded test ' || n FROM generate_series(1,199) n;
DO $$ BEGIN
 BEGIN
  INSERT INTO public.help_chat_messages(thread_id,role,content) VALUES ('84444444-4444-4444-8444-444444444444','user','Overflow');
  RAISE EXCEPTION 'Expected bounded conversation';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Help conversation full' THEN RAISE; END IF;
 END;
 IF has_table_privilege('anon','public.help_chat_threads','SELECT') THEN RAISE EXCEPTION 'Anonymous history access'; END IF;
 IF has_table_privilege('authenticated','public.help_chat_threads','UPDATE') THEN RAISE EXCEPTION 'Ownership changes allowed'; END IF;
END $$;
RESET ROLE;
UPDATE public.organization_members SET status='blocked' WHERE organization_id='81111111-1111-4111-8111-111111111111' AND user_id='e608329a-39fb-47ab-a759-20624dbd5b5e';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.help_chat_threads WHERE id='84444444-4444-4444-8444-444444444444') THEN RAISE EXCEPTION 'Blocked membership still reads history'; END IF;
END $$;
ROLLBACK;
SELECT 'Help history RLS, ownership, tenant isolation and bounds: PASS; fixtures rolled back' AS result;
