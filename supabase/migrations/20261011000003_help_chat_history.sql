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
