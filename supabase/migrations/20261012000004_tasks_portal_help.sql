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
