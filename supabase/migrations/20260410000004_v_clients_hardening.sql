-- 🔒 20260410000004_v_clients_hardening.sql
-- Security Hardening for Client Views
-- Moving from SECURITY DEFINER to SECURITY INVOKER to respect RLS

-- 🛠️ Update v_clients to use SECURITY INVOKER (Postgres default for views is usually invoker, but we force it for clarity and safety)
-- This ensures that it respects the RLS policies of the underlying 'leads' table.

ALTER VIEW public.v_clients SET (security_invoker = on);

-- Note: In older versions of Postgres/PostGIS or specific Supabase setups, 
-- you might need to recreate the view if 'security_invoker' parameter is not supported.
-- However, for the current environment, this is the standard hardening approach.
