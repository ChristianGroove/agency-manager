-- Supabase default privileges can grant named roles EXECUTE beyond PUBLIC.
-- Keep the history access predicate callable only by authenticated sessions.
REVOKE ALL ON FUNCTION public.can_access_help_tenant(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_help_tenant(uuid) TO authenticated;
-- Trigger execution does not require callers to invoke the trigger function directly.
REVOKE ALL ON FUNCTION public.limit_help_chat_messages() FROM PUBLIC, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
