-- CLEANUP_DEBUG_POLICY.sql
-- Run this to revert the "allow_all" debug policy and ensure security is restored.

DROP POLICY IF EXISTS "debug_manage_service_catalog" ON public.service_catalog;

-- Ensure standard policies are active (idempotent re-run of the fix)
-- You should have already run 'fix_service_catalog_rls.sql'. 
-- If not, running this alone removes the debug hole but might leave you with the old broken RLS if you didn't apply the Spanish roles fix.
-- So, this script just cleans the debug mess.
