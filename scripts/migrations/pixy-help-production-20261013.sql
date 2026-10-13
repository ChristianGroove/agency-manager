-- Prepared for the production preflight supplied on 2026-10-13.
-- Scope: missing member status prerequisite + five help migrations. No onboarding/Cartera.
-- Execute the entire file in the confirmed production Supabase SQL Editor.
-- Any failure rolls back the batch; never run only a selected fragment.
-- This does not deploy code, enable the robot, change tenant status or copy local configuration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(hashtext('pixy-help-production-20261013'));
DO $guard$
DECLARE object_name text;
BEGIN
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version IN ('20261011000001', '20261011000003', '20261012000004', '20261012000005', '20261012000006')) THEN
   RAISE EXCEPTION 'Help migrations already registered; reconcile before running this batch';
 END IF;
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260619022610'
   AND name IS DISTINCT FROM 'add_member_status') THEN
   RAISE EXCEPTION 'Member status migration version belongs to a different migration';
 END IF;
 FOREACH object_name IN ARRAY ARRAY['help_chat_threads', 'help_chat_messages', 'help_portal_threads', 'help_portal_messages', 'help_portal_turns', 'help_portal_staff_limits', 'help_portal_tenant_limits', 'help_dashboard_tenant_limits'] LOOP
   IF to_regclass('public.' || object_name) IS NOT NULL THEN
     RAISE EXCEPTION 'Help object already exists: %. Reconcile instead of overwriting', object_name;
   END IF;
 END LOOP;
 FOREACH object_name IN ARRAY ARRAY['can_access_help_tenant(uuid)', 'limit_help_chat_messages()', 'reserve_dashboard_help_request(uuid)', 'begin_portal_help_turn(uuid,uuid,uuid,text,uuid)', 'finish_portal_help_turn(uuid,uuid,uuid,text,text[])'] LOOP
   IF to_regprocedure('public.' || object_name) IS NOT NULL THEN
     RAISE EXCEPTION 'Help function already exists: %. Reconcile instead of overwriting', object_name;
   END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('public.platform_settings')
   AND attname = 'pet_config' AND NOT attisdropped) THEN
   RAISE EXCEPTION 'Pet configuration already exists; compare before running this batch';
 END IF;
END;
$guard$;

-- Source: supabase/migrations/20260619022610_add_member_status.sql
-- SHA-256 UTF-8 LF: f439dad0a2013c48a9d3826401287a79eab67a6e025edb841257007f39fda3b5
-- Add status column to organization_members for blocking users
ALTER TABLE "public"."organization_members" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';

INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
SELECT '20260619022610', 'add_member_status', ARRAY[$source_20260619022610$-- Add status column to organization_members for blocking users
ALTER TABLE "public"."organization_members" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';
$source_20260619022610$] WHERE NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260619022610');

-- Source: supabase/migrations/20261011000001_platform_robot_pet.sql
-- SHA-256 UTF-8 LF: e9fd08c145dc755ea01533bbc715c3ab67c4e4cda3ac54a152bc33fe5bc4c5db
-- Additive, opt-in visual configuration. Existing platform_settings RLS is unchanged:
-- public reads, writes through the authorized super-admin server action/service role.
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS pet_config jsonb NOT NULL DEFAULT '{"version":1,"enabled":false}'::jsonb;

COMMENT ON COLUMN public.platform_settings.pet_config IS
  'Public visual robot pet configuration. No credentials. Schema validated by Pixy; disabled by default.';

INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
SELECT '20261011000001', 'platform_robot_pet', ARRAY[$source_20261011000001$-- Additive, opt-in visual configuration. Existing platform_settings RLS is unchanged:
-- public reads, writes through the authorized super-admin server action/service role.
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS pet_config jsonb NOT NULL DEFAULT '{"version":1,"enabled":false}'::jsonb;

COMMENT ON COLUMN public.platform_settings.pet_config IS
  'Public visual robot pet configuration. No credentials. Schema validated by Pixy; disabled by default.';
$source_20261011000001$];

-- Source: supabase/migrations/20261011000003_help_chat_history.sql
-- SHA-256 UTF-8 LF: ac4342fce86537c2d37659e9791ecc8a0647f71686eaad829d8d3a6b3052b284
-- Private help history. No service-role access in application actions.
CREATE FUNCTION public.can_access_help_tenant(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = p_org
      AND m.user_id = auth.uid() AND m.status IS DISTINCT FROM 'blocked')
    OR EXISTS (SELECT 1 FROM organizations o JOIN organization_members m
      ON m.organization_id = o.parent_organization_id WHERE o.id = p_org
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
      AND m.status IS DISTINCT FROM 'blocked')
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
      AND replace(lower(p.platform_role::text), '_', '') = 'superadmin')
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_help_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_help_tenant(uuid) TO authenticated;

CREATE TABLE public.help_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX help_chat_threads_owner ON public.help_chat_threads(user_id, organization_id, created_at DESC, id DESC);
CREATE TABLE public.help_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.help_chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX help_chat_messages_thread ON public.help_chat_messages(thread_id, created_at, id);
ALTER TABLE public.help_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY help_threads_read ON public.help_chat_threads FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.can_access_help_tenant(organization_id));
CREATE POLICY help_threads_insert ON public.help_chat_threads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_help_tenant(organization_id));
CREATE POLICY help_messages_read ON public.help_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.help_chat_threads t WHERE t.id = thread_id));
CREATE POLICY help_messages_insert ON public.help_chat_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.help_chat_threads t WHERE t.id = thread_id));
REVOKE ALL ON public.help_chat_threads, public.help_chat_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON public.help_chat_threads, public.help_chat_messages TO authenticated;

-- Bound each thread, serializing inserts without permitting ownership changes.
CREATE FUNCTION public.limit_help_chat_messages() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM public.help_chat_threads WHERE id = NEW.thread_id FOR UPDATE;
  IF (SELECT count(*) FROM public.help_chat_messages WHERE thread_id = NEW.thread_id) >= 200 THEN
    RAISE EXCEPTION 'Help conversation full';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.limit_help_chat_messages() FROM PUBLIC;
CREATE TRIGGER help_chat_message_limit BEFORE INSERT ON public.help_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.limit_help_chat_messages();

INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
SELECT '20261011000003', 'help_chat_history', ARRAY[$source_20261011000003$-- Private help history. No service-role access in application actions.
CREATE FUNCTION public.can_access_help_tenant(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = p_org
      AND m.user_id = auth.uid() AND m.status IS DISTINCT FROM 'blocked')
    OR EXISTS (SELECT 1 FROM organizations o JOIN organization_members m
      ON m.organization_id = o.parent_organization_id WHERE o.id = p_org
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
      AND m.status IS DISTINCT FROM 'blocked')
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
      AND replace(lower(p.platform_role::text), '_', '') = 'superadmin')
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_help_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_help_tenant(uuid) TO authenticated;

CREATE TABLE public.help_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX help_chat_threads_owner ON public.help_chat_threads(user_id, organization_id, created_at DESC, id DESC);
CREATE TABLE public.help_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.help_chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX help_chat_messages_thread ON public.help_chat_messages(thread_id, created_at, id);
ALTER TABLE public.help_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY help_threads_read ON public.help_chat_threads FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.can_access_help_tenant(organization_id));
CREATE POLICY help_threads_insert ON public.help_chat_threads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_help_tenant(organization_id));
CREATE POLICY help_messages_read ON public.help_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.help_chat_threads t WHERE t.id = thread_id));
CREATE POLICY help_messages_insert ON public.help_chat_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.help_chat_threads t WHERE t.id = thread_id));
REVOKE ALL ON public.help_chat_threads, public.help_chat_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON public.help_chat_threads, public.help_chat_messages TO authenticated;

-- Bound each thread, serializing inserts without permitting ownership changes.
CREATE FUNCTION public.limit_help_chat_messages() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM public.help_chat_threads WHERE id = NEW.thread_id FOR UPDATE;
  IF (SELECT count(*) FROM public.help_chat_messages WHERE thread_id = NEW.thread_id) >= 200 THEN
    RAISE EXCEPTION 'Help conversation full';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.limit_help_chat_messages() FROM PUBLIC;
CREATE TRIGGER help_chat_message_limit BEFORE INSERT ON public.help_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.limit_help_chat_messages();
$source_20261011000003$];

-- Source: supabase/migrations/20261012000004_tasks_portal_help.sql
-- SHA-256 UTF-8 LF: 742efd341002671286b500cb327b038d658865cb0d3e015b98dc5cfd97b68943
-- Portal help is separate from auth.users and dashboard history. Only trusted server RPCs write.
CREATE TABLE public.help_portal_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
  surface text NOT NULL DEFAULT 'portal.tasks' CHECK (surface = 'portal.tasks'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(), last_activity timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX help_portal_owner ON public.help_portal_threads(organization_id,staff_id,surface,created_at DESC,id DESC);
CREATE TABLE public.help_portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), thread_id uuid NOT NULL REFERENCES public.help_portal_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')), content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
  article_ids text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX help_portal_message_order ON public.help_portal_messages(thread_id,created_at,id);
CREATE TABLE public.help_portal_turns (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
  request_id uuid NOT NULL, thread_id uuid NOT NULL REFERENCES public.help_portal_threads(id) ON DELETE CASCADE,
  question_message_id uuid NOT NULL REFERENCES public.help_portal_messages(id) ON DELETE CASCADE,
  answer_message_id uuid REFERENCES public.help_portal_messages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','complete','failed')),
  PRIMARY KEY(organization_id,staff_id,request_id)
);
CREATE TABLE public.help_portal_tenant_limits (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  window_started timestamptz NOT NULL DEFAULT now(), minute_count integer NOT NULL DEFAULT 0,
  day_started date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date, day_count integer NOT NULL DEFAULT 0
);
CREATE TABLE public.help_portal_staff_limits (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
  window_started timestamptz NOT NULL DEFAULT now(), minute_count integer NOT NULL DEFAULT 0,
  active_request uuid, lease_until timestamptz,
  PRIMARY KEY(organization_id,staff_id)
);
ALTER TABLE public.help_portal_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_portal_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_portal_tenant_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_portal_staff_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.help_portal_threads, public.help_portal_messages, public.help_portal_turns,
 public.help_portal_tenant_limits, public.help_portal_staff_limits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.help_portal_threads, public.help_portal_messages, public.help_portal_turns,
 public.help_portal_tenant_limits, public.help_portal_staff_limits TO service_role;

CREATE FUNCTION public.begin_portal_help_turn(p_org uuid,p_staff uuid,p_request uuid,p_question text,p_thread uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE t public.help_portal_turns; th uuid; msg uuid; count_msgs integer; tenant_limit public.help_portal_tenant_limits;
 staff_limit public.help_portal_staff_limits; question_original text; answer text;
BEGIN
 IF p_request IS NULL OR p_question IS NULL OR char_length(p_question) NOT BETWEEN 3 AND 500 THEN RETURN jsonb_build_object('status','invalid'); END IF;
 IF NOT EXISTS(SELECT 1 FROM organization_staff s JOIN organizations o ON o.id=s.organization_id
  WHERE s.id=p_staff AND s.organization_id=p_org AND s.is_active=true AND o.status::text='active') THEN RETURN jsonb_build_object('status','denied'); END IF;
 INSERT INTO help_portal_tenant_limits(organization_id) VALUES(p_org) ON CONFLICT DO NOTHING;
 SELECT * INTO tenant_limit FROM help_portal_tenant_limits WHERE organization_id=p_org FOR UPDATE;
 INSERT INTO help_portal_staff_limits(organization_id,staff_id) VALUES(p_org,p_staff) ON CONFLICT DO NOTHING;
 SELECT * INTO staff_limit FROM help_portal_staff_limits WHERE organization_id=p_org AND staff_id=p_staff FOR UPDATE;
 SELECT * INTO t FROM help_portal_turns WHERE organization_id=p_org AND staff_id=p_staff AND request_id=p_request;
 IF FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM help_portal_threads WHERE id=t.thread_id AND organization_id=p_org AND staff_id=p_staff
   AND surface='portal.tasks' AND last_activity>=now()-interval '30 days') THEN RETURN jsonb_build_object('status','invalid_thread'); END IF;
  SELECT content INTO question_original FROM help_portal_messages WHERE id=t.question_message_id;
  IF question_original IS DISTINCT FROM p_question OR (p_thread IS NOT NULL AND t.thread_id<>p_thread) THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF t.status='complete' THEN
   SELECT content INTO answer FROM help_portal_messages WHERE id=t.answer_message_id;
   RETURN jsonb_build_object('status','duplicate','thread_id',t.thread_id,'message',answer,'article_ids',
    (SELECT to_jsonb(article_ids) FROM help_portal_messages WHERE id=t.answer_message_id));
  END IF;
  RETURN jsonb_build_object('status',CASE WHEN t.status='pending' AND staff_limit.lease_until>now() THEN 'busy' ELSE 'failed' END);
 END IF;
 IF staff_limit.active_request IS NOT NULL AND staff_limit.lease_until>now() THEN RETURN jsonb_build_object('status','busy'); END IF;
 IF p_thread IS NOT NULL THEN
  SELECT id INTO th FROM help_portal_threads WHERE id=p_thread AND organization_id=p_org AND staff_id=p_staff
   AND surface='portal.tasks' AND last_activity>=now()-interval '30 days' FOR UPDATE;
  IF th IS NULL THEN RETURN jsonb_build_object('status','invalid_thread'); END IF;
  SELECT count(*) INTO count_msgs FROM help_portal_messages WHERE thread_id=th;
  IF count_msgs>198 THEN RETURN jsonb_build_object('status','full'); END IF;
 END IF;
 IF staff_limit.window_started<=now()-interval '1 minute' THEN staff_limit.minute_count:=0; staff_limit.window_started:=now(); END IF;
 IF tenant_limit.window_started<=now()-interval '1 minute' THEN tenant_limit.minute_count:=0; tenant_limit.window_started:=now(); END IF;
 IF tenant_limit.day_started<>(now() AT TIME ZONE 'UTC')::date THEN tenant_limit.day_count:=0; tenant_limit.day_started:=(now() AT TIME ZONE 'UTC')::date; END IF;
 IF staff_limit.minute_count>=10 OR tenant_limit.minute_count>=30 OR tenant_limit.day_count>=300 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;
 DELETE FROM help_portal_threads WHERE organization_id=p_org AND staff_id=p_staff AND last_activity<now()-interval '30 days';
 IF th IS NULL THEN
  IF (SELECT count(*) FROM help_portal_threads WHERE organization_id=p_org AND staff_id=p_staff)>=50 THEN RETURN jsonb_build_object('status','history_full'); END IF;
  INSERT INTO help_portal_threads(organization_id,staff_id,title) VALUES(p_org,p_staff,left(p_question,80)) RETURNING id INTO th;
 END IF;
 INSERT INTO help_portal_messages(thread_id,role,content) VALUES(th,'user',p_question) RETURNING id INTO msg;
 INSERT INTO help_portal_turns(organization_id,staff_id,request_id,thread_id,question_message_id) VALUES(p_org,p_staff,p_request,th,msg);
 UPDATE help_portal_threads SET last_activity=now() WHERE id=th;
 UPDATE help_portal_tenant_limits SET window_started=tenant_limit.window_started,minute_count=tenant_limit.minute_count+1,
  day_started=tenant_limit.day_started,day_count=tenant_limit.day_count+1 WHERE organization_id=p_org;
 UPDATE help_portal_staff_limits SET window_started=staff_limit.window_started,minute_count=staff_limit.minute_count+1,
  active_request=p_request,lease_until=now()+interval '5 minutes' WHERE organization_id=p_org AND staff_id=p_staff;
 RETURN jsonb_build_object('status','reserved','thread_id',th);
END; $$;

CREATE FUNCTION public.finish_portal_help_turn(p_org uuid,p_staff uuid,p_request uuid,p_answer text DEFAULT NULL,p_articles text[] DEFAULT '{}')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE t public.help_portal_turns; lock_row public.help_portal_staff_limits; answer_id uuid;
BEGIN
 SELECT * INTO lock_row FROM help_portal_staff_limits WHERE organization_id=p_org AND staff_id=p_staff FOR UPDATE;
 IF NOT FOUND OR lock_row.active_request IS DISTINCT FROM p_request OR lock_row.lease_until<=now() THEN RETURN false; END IF;
 SELECT * INTO t FROM help_portal_turns WHERE organization_id=p_org AND staff_id=p_staff AND request_id=p_request AND status='pending' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_answer IS NOT NULL THEN
  IF char_length(p_answer) NOT BETWEEN 1 AND 12000 OR p_articles IS NULL OR cardinality(p_articles)>5
   OR EXISTS(SELECT 1 FROM unnest(p_articles) a WHERE a IS NULL OR a !~ '^tasks-portal\.[a-z0-9.-]+$') THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM organization_staff s JOIN organizations o ON o.id=s.organization_id
   WHERE s.id=p_staff AND s.organization_id=p_org AND s.is_active=true AND o.status::text='active') THEN RETURN false; END IF;
  INSERT INTO help_portal_messages(thread_id,role,content,article_ids) VALUES(t.thread_id,'assistant',p_answer,p_articles) RETURNING id INTO answer_id;
 END IF;
 UPDATE help_portal_turns SET status=CASE WHEN p_answer IS NULL THEN 'failed' ELSE 'complete' END,answer_message_id=answer_id
  WHERE organization_id=p_org AND staff_id=p_staff AND request_id=p_request;
 UPDATE help_portal_staff_limits SET active_request=NULL,lease_until=NULL WHERE organization_id=p_org AND staff_id=p_staff;
 UPDATE help_portal_threads SET last_activity=now() WHERE id=t.thread_id;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.begin_portal_help_turn(uuid,uuid,uuid,text,uuid), public.finish_portal_help_turn(uuid,uuid,uuid,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_portal_help_turn(uuid,uuid,uuid,text,uuid), public.finish_portal_help_turn(uuid,uuid,uuid,text,text[]) TO service_role;
NOTIFY pgrst, 'reload schema';

INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
SELECT '20261012000004', 'tasks_portal_help', ARRAY[$source_20261012000004$-- Portal help is separate from auth.users and dashboard history. Only trusted server RPCs write.
CREATE TABLE public.help_portal_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
  surface text NOT NULL DEFAULT 'portal.tasks' CHECK (surface = 'portal.tasks'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(), last_activity timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX help_portal_owner ON public.help_portal_threads(organization_id,staff_id,surface,created_at DESC,id DESC);
CREATE TABLE public.help_portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), thread_id uuid NOT NULL REFERENCES public.help_portal_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')), content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
  article_ids text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX help_portal_message_order ON public.help_portal_messages(thread_id,created_at,id);
CREATE TABLE public.help_portal_turns (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
  request_id uuid NOT NULL, thread_id uuid NOT NULL REFERENCES public.help_portal_threads(id) ON DELETE CASCADE,
  question_message_id uuid NOT NULL REFERENCES public.help_portal_messages(id) ON DELETE CASCADE,
  answer_message_id uuid REFERENCES public.help_portal_messages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','complete','failed')),
  PRIMARY KEY(organization_id,staff_id,request_id)
);
CREATE TABLE public.help_portal_tenant_limits (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  window_started timestamptz NOT NULL DEFAULT now(), minute_count integer NOT NULL DEFAULT 0,
  day_started date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date, day_count integer NOT NULL DEFAULT 0
);
CREATE TABLE public.help_portal_staff_limits (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
  window_started timestamptz NOT NULL DEFAULT now(), minute_count integer NOT NULL DEFAULT 0,
  active_request uuid, lease_until timestamptz,
  PRIMARY KEY(organization_id,staff_id)
);
ALTER TABLE public.help_portal_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_portal_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_portal_tenant_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_portal_staff_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.help_portal_threads, public.help_portal_messages, public.help_portal_turns,
 public.help_portal_tenant_limits, public.help_portal_staff_limits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.help_portal_threads, public.help_portal_messages, public.help_portal_turns,
 public.help_portal_tenant_limits, public.help_portal_staff_limits TO service_role;

CREATE FUNCTION public.begin_portal_help_turn(p_org uuid,p_staff uuid,p_request uuid,p_question text,p_thread uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE t public.help_portal_turns; th uuid; msg uuid; count_msgs integer; tenant_limit public.help_portal_tenant_limits;
 staff_limit public.help_portal_staff_limits; question_original text; answer text;
BEGIN
 IF p_request IS NULL OR p_question IS NULL OR char_length(p_question) NOT BETWEEN 3 AND 500 THEN RETURN jsonb_build_object('status','invalid'); END IF;
 IF NOT EXISTS(SELECT 1 FROM organization_staff s JOIN organizations o ON o.id=s.organization_id
  WHERE s.id=p_staff AND s.organization_id=p_org AND s.is_active=true AND o.status::text='active') THEN RETURN jsonb_build_object('status','denied'); END IF;
 INSERT INTO help_portal_tenant_limits(organization_id) VALUES(p_org) ON CONFLICT DO NOTHING;
 SELECT * INTO tenant_limit FROM help_portal_tenant_limits WHERE organization_id=p_org FOR UPDATE;
 INSERT INTO help_portal_staff_limits(organization_id,staff_id) VALUES(p_org,p_staff) ON CONFLICT DO NOTHING;
 SELECT * INTO staff_limit FROM help_portal_staff_limits WHERE organization_id=p_org AND staff_id=p_staff FOR UPDATE;
 SELECT * INTO t FROM help_portal_turns WHERE organization_id=p_org AND staff_id=p_staff AND request_id=p_request;
 IF FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM help_portal_threads WHERE id=t.thread_id AND organization_id=p_org AND staff_id=p_staff
   AND surface='portal.tasks' AND last_activity>=now()-interval '30 days') THEN RETURN jsonb_build_object('status','invalid_thread'); END IF;
  SELECT content INTO question_original FROM help_portal_messages WHERE id=t.question_message_id;
  IF question_original IS DISTINCT FROM p_question OR (p_thread IS NOT NULL AND t.thread_id<>p_thread) THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF t.status='complete' THEN
   SELECT content INTO answer FROM help_portal_messages WHERE id=t.answer_message_id;
   RETURN jsonb_build_object('status','duplicate','thread_id',t.thread_id,'message',answer,'article_ids',
    (SELECT to_jsonb(article_ids) FROM help_portal_messages WHERE id=t.answer_message_id));
  END IF;
  RETURN jsonb_build_object('status',CASE WHEN t.status='pending' AND staff_limit.lease_until>now() THEN 'busy' ELSE 'failed' END);
 END IF;
 IF staff_limit.active_request IS NOT NULL AND staff_limit.lease_until>now() THEN RETURN jsonb_build_object('status','busy'); END IF;
 IF p_thread IS NOT NULL THEN
  SELECT id INTO th FROM help_portal_threads WHERE id=p_thread AND organization_id=p_org AND staff_id=p_staff
   AND surface='portal.tasks' AND last_activity>=now()-interval '30 days' FOR UPDATE;
  IF th IS NULL THEN RETURN jsonb_build_object('status','invalid_thread'); END IF;
  SELECT count(*) INTO count_msgs FROM help_portal_messages WHERE thread_id=th;
  IF count_msgs>198 THEN RETURN jsonb_build_object('status','full'); END IF;
 END IF;
 IF staff_limit.window_started<=now()-interval '1 minute' THEN staff_limit.minute_count:=0; staff_limit.window_started:=now(); END IF;
 IF tenant_limit.window_started<=now()-interval '1 minute' THEN tenant_limit.minute_count:=0; tenant_limit.window_started:=now(); END IF;
 IF tenant_limit.day_started<>(now() AT TIME ZONE 'UTC')::date THEN tenant_limit.day_count:=0; tenant_limit.day_started:=(now() AT TIME ZONE 'UTC')::date; END IF;
 IF staff_limit.minute_count>=10 OR tenant_limit.minute_count>=30 OR tenant_limit.day_count>=300 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;
 DELETE FROM help_portal_threads WHERE organization_id=p_org AND staff_id=p_staff AND last_activity<now()-interval '30 days';
 IF th IS NULL THEN
  IF (SELECT count(*) FROM help_portal_threads WHERE organization_id=p_org AND staff_id=p_staff)>=50 THEN RETURN jsonb_build_object('status','history_full'); END IF;
  INSERT INTO help_portal_threads(organization_id,staff_id,title) VALUES(p_org,p_staff,left(p_question,80)) RETURNING id INTO th;
 END IF;
 INSERT INTO help_portal_messages(thread_id,role,content) VALUES(th,'user',p_question) RETURNING id INTO msg;
 INSERT INTO help_portal_turns(organization_id,staff_id,request_id,thread_id,question_message_id) VALUES(p_org,p_staff,p_request,th,msg);
 UPDATE help_portal_threads SET last_activity=now() WHERE id=th;
 UPDATE help_portal_tenant_limits SET window_started=tenant_limit.window_started,minute_count=tenant_limit.minute_count+1,
  day_started=tenant_limit.day_started,day_count=tenant_limit.day_count+1 WHERE organization_id=p_org;
 UPDATE help_portal_staff_limits SET window_started=staff_limit.window_started,minute_count=staff_limit.minute_count+1,
  active_request=p_request,lease_until=now()+interval '5 minutes' WHERE organization_id=p_org AND staff_id=p_staff;
 RETURN jsonb_build_object('status','reserved','thread_id',th);
END; $$;

CREATE FUNCTION public.finish_portal_help_turn(p_org uuid,p_staff uuid,p_request uuid,p_answer text DEFAULT NULL,p_articles text[] DEFAULT '{}')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE t public.help_portal_turns; lock_row public.help_portal_staff_limits; answer_id uuid;
BEGIN
 SELECT * INTO lock_row FROM help_portal_staff_limits WHERE organization_id=p_org AND staff_id=p_staff FOR UPDATE;
 IF NOT FOUND OR lock_row.active_request IS DISTINCT FROM p_request OR lock_row.lease_until<=now() THEN RETURN false; END IF;
 SELECT * INTO t FROM help_portal_turns WHERE organization_id=p_org AND staff_id=p_staff AND request_id=p_request AND status='pending' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_answer IS NOT NULL THEN
  IF char_length(p_answer) NOT BETWEEN 1 AND 12000 OR p_articles IS NULL OR cardinality(p_articles)>5
   OR EXISTS(SELECT 1 FROM unnest(p_articles) a WHERE a IS NULL OR a !~ '^tasks-portal\.[a-z0-9.-]+$') THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM organization_staff s JOIN organizations o ON o.id=s.organization_id
   WHERE s.id=p_staff AND s.organization_id=p_org AND s.is_active=true AND o.status::text='active') THEN RETURN false; END IF;
  INSERT INTO help_portal_messages(thread_id,role,content,article_ids) VALUES(t.thread_id,'assistant',p_answer,p_articles) RETURNING id INTO answer_id;
 END IF;
 UPDATE help_portal_turns SET status=CASE WHEN p_answer IS NULL THEN 'failed' ELSE 'complete' END,answer_message_id=answer_id
  WHERE organization_id=p_org AND staff_id=p_staff AND request_id=p_request;
 UPDATE help_portal_staff_limits SET active_request=NULL,lease_until=NULL WHERE organization_id=p_org AND staff_id=p_staff;
 UPDATE help_portal_threads SET last_activity=now() WHERE id=t.thread_id;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.begin_portal_help_turn(uuid,uuid,uuid,text,uuid), public.finish_portal_help_turn(uuid,uuid,uuid,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_portal_help_turn(uuid,uuid,uuid,text,uuid), public.finish_portal_help_turn(uuid,uuid,uuid,text,text[]) TO service_role;
NOTIFY pgrst, 'reload schema';
$source_20261012000004$];

-- Source: supabase/migrations/20261012000005_dashboard_help_quota.sql
-- SHA-256 UTF-8 LF: 10dbca748f53d08286c08f42cfcc0b08cead11c618dc2fe6af869c06d657d4c0
-- Shared dashboard help quota. Authenticated callers cannot read or edit counters directly.
CREATE TABLE public.help_dashboard_tenant_limits (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  window_started timestamptz NOT NULL DEFAULT clock_timestamp(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count BETWEEN 0 AND 10)
);
ALTER TABLE public.help_dashboard_tenant_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.help_dashboard_tenant_limits FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.help_dashboard_tenant_limits TO service_role;

CREATE FUNCTION public.reserve_dashboard_help_request(p_org uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE quota public.help_dashboard_tenant_limits; requested_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_help_tenant(p_org)
    OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=p_org AND status::text='active') THEN
    RETURN jsonb_build_object('status','denied');
  END IF;
  INSERT INTO public.help_dashboard_tenant_limits(organization_id) VALUES(p_org) ON CONFLICT DO NOTHING;
  SELECT * INTO quota FROM public.help_dashboard_tenant_limits WHERE organization_id=p_org FOR UPDATE;
  -- Read the clock AFTER waiting for the row lock, not at transaction start.
  requested_at := clock_timestamp();
  IF quota.window_started<=requested_at-interval '1 minute' THEN
    quota.window_started := requested_at;
    quota.request_count := 0;
  END IF;
  IF quota.request_count>=10 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;
  UPDATE public.help_dashboard_tenant_limits SET window_started=quota.window_started,
    request_count=quota.request_count+1 WHERE organization_id=p_org;
  RETURN jsonb_build_object('status','allowed');
END; $$;
REVOKE ALL ON FUNCTION public.reserve_dashboard_help_request(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_dashboard_help_request(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';

INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
SELECT '20261012000005', 'dashboard_help_quota', ARRAY[$source_20261012000005$-- Shared dashboard help quota. Authenticated callers cannot read or edit counters directly.
CREATE TABLE public.help_dashboard_tenant_limits (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  window_started timestamptz NOT NULL DEFAULT clock_timestamp(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count BETWEEN 0 AND 10)
);
ALTER TABLE public.help_dashboard_tenant_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.help_dashboard_tenant_limits FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.help_dashboard_tenant_limits TO service_role;

CREATE FUNCTION public.reserve_dashboard_help_request(p_org uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE quota public.help_dashboard_tenant_limits; requested_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_help_tenant(p_org)
    OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=p_org AND status::text='active') THEN
    RETURN jsonb_build_object('status','denied');
  END IF;
  INSERT INTO public.help_dashboard_tenant_limits(organization_id) VALUES(p_org) ON CONFLICT DO NOTHING;
  SELECT * INTO quota FROM public.help_dashboard_tenant_limits WHERE organization_id=p_org FOR UPDATE;
  -- Read the clock AFTER waiting for the row lock, not at transaction start.
  requested_at := clock_timestamp();
  IF quota.window_started<=requested_at-interval '1 minute' THEN
    quota.window_started := requested_at;
    quota.request_count := 0;
  END IF;
  IF quota.request_count>=10 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;
  UPDATE public.help_dashboard_tenant_limits SET window_started=quota.window_started,
    request_count=quota.request_count+1 WHERE organization_id=p_org;
  RETURN jsonb_build_object('status','allowed');
END; $$;
REVOKE ALL ON FUNCTION public.reserve_dashboard_help_request(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_dashboard_help_request(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
$source_20261012000005$];

-- Source: supabase/migrations/20261012000006_help_function_privileges.sql
-- SHA-256 UTF-8 LF: 0336ec62659159b91493ef8a39730d70dbaf67bb05bbfa86ece6888ebfb57ef2
-- Supabase default privileges can grant named roles EXECUTE beyond PUBLIC.
-- Keep the history access predicate callable only by authenticated sessions.
REVOKE ALL ON FUNCTION public.can_access_help_tenant(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_help_tenant(uuid) TO authenticated;
-- Trigger execution does not require callers to invoke the trigger function directly.
REVOKE ALL ON FUNCTION public.limit_help_chat_messages() FROM PUBLIC, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
SELECT '20261012000006', 'help_function_privileges', ARRAY[$source_20261012000006$-- Supabase default privileges can grant named roles EXECUTE beyond PUBLIC.
-- Keep the history access predicate callable only by authenticated sessions.
REVOKE ALL ON FUNCTION public.can_access_help_tenant(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_help_tenant(uuid) TO authenticated;
-- Trigger execution does not require callers to invoke the trigger function directly.
REVOKE ALL ON FUNCTION public.limit_help_chat_messages() FROM PUBLIC, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
$source_20261012000006$];

DO $verify$
DECLARE object_name text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.organization_members'::regclass
   AND attname='status' AND atttypid='text'::regtype AND NOT attisdropped) THEN
   RAISE EXCEPTION 'Member status column has an unexpected type';
 END IF;
 FOREACH object_name IN ARRAY ARRAY['help_chat_threads', 'help_chat_messages', 'help_portal_threads', 'help_portal_messages', 'help_portal_turns', 'help_portal_staff_limits', 'help_portal_tenant_limits', 'help_dashboard_tenant_limits'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.' || object_name) AND relrowsecurity) THEN
     RAISE EXCEPTION 'Help table is missing RLS: %', object_name;
   END IF;
 END LOOP;
 IF has_function_privilege('anon','public.can_access_help_tenant(uuid)','EXECUTE')
   OR has_function_privilege('service_role','public.can_access_help_tenant(uuid)','EXECUTE')
   OR NOT has_function_privilege('authenticated','public.can_access_help_tenant(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Unexpected history predicate privileges';
 END IF;
 IF has_function_privilege('anon','public.limit_help_chat_messages()','EXECUTE')
   OR has_function_privilege('authenticated','public.limit_help_chat_messages()','EXECUTE')
   OR has_function_privilege('service_role','public.limit_help_chat_messages()','EXECUTE') THEN
   RAISE EXCEPTION 'Trigger function has unexpected direct callers';
 END IF;
 IF has_function_privilege('anon','public.reserve_dashboard_help_request(uuid)','EXECUTE')
   OR has_function_privilege('service_role','public.reserve_dashboard_help_request(uuid)','EXECUTE')
   OR NOT has_function_privilege('authenticated','public.reserve_dashboard_help_request(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Unexpected dashboard quota privileges';
 END IF;
END;
$verify$;
COMMIT;
SELECT 'applied' AS result, version, name FROM supabase_migrations.schema_migrations
 WHERE version IN ('20260619022610', '20261011000001', '20261011000003', '20261012000004', '20261012000005', '20261012000006') ORDER BY version;
