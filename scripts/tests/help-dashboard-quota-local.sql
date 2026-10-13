-- Only local supabase_db_agency-manager. Uses an existing local fixture user; all changes roll back.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.organizations(id,name,slug,status) VALUES
 ('86666666-6666-4666-8666-666666666661','Help quota fixture A','help-quota-fixture-a','active'),
 ('86666666-6666-4666-8666-666666666662','Help quota fixture B','help-quota-fixture-b','active');
INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES
 ('86666666-6666-4666-8666-666666666661','e608329a-39fb-47ab-a759-20624dbd5b5e','member','active');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e608329a-39fb-47ab-a759-20624dbd5b5e',true);
DO $$ DECLARE n integer; answer text; BEGIN
 FOR n IN 1..10 LOOP
  answer := public.reserve_dashboard_help_request('86666666-6666-4666-8666-666666666661')->>'status';
  IF answer<>'allowed' THEN RAISE EXCEPTION 'Valid request % rejected',n; END IF;
 END LOOP;
 IF public.reserve_dashboard_help_request('86666666-6666-4666-8666-666666666661')->>'status'<>'rate_limited' THEN RAISE EXCEPTION 'Quota overflow allowed'; END IF;
 IF public.reserve_dashboard_help_request('86666666-6666-4666-8666-666666666662')->>'status'<>'denied' THEN RAISE EXCEPTION 'Cross tenant quota allowed'; END IF;
 IF has_table_privilege('authenticated','public.help_dashboard_tenant_limits','SELECT') OR has_table_privilege('authenticated','public.help_dashboard_tenant_limits','UPDATE')
  OR has_table_privilege('authenticated','public.help_dashboard_tenant_limits','INSERT') THEN RAISE EXCEPTION 'Direct counter access allowed'; END IF;
 IF has_function_privilege('anon','public.reserve_dashboard_help_request(uuid)','EXECUTE') OR has_function_privilege('service_role','public.reserve_dashboard_help_request(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Unauthenticated quota RPC allowed'; END IF;
END $$;
RESET ROLE;
UPDATE public.help_dashboard_tenant_limits SET window_started=clock_timestamp()-interval '61 seconds' WHERE organization_id='86666666-6666-4666-8666-666666666661';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.reserve_dashboard_help_request('86666666-6666-4666-8666-666666666661')->>'status'<>'allowed' THEN RAISE EXCEPTION 'Expired window not reset'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT request_count FROM public.help_dashboard_tenant_limits WHERE organization_id='86666666-6666-4666-8666-666666666661')<>1 THEN RAISE EXCEPTION 'Reset counter incorrect'; END IF;
END $$;
UPDATE public.organization_members SET status='blocked' WHERE organization_id='86666666-6666-4666-8666-666666666661';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.reserve_dashboard_help_request('86666666-6666-4666-8666-666666666661')->>'status'<>'denied' THEN RAISE EXCEPTION 'Blocked membership allowed'; END IF;
END $$;
RESET ROLE;
UPDATE public.organization_members SET status='active' WHERE organization_id='86666666-6666-4666-8666-666666666661';
UPDATE public.organizations SET status='suspended' WHERE id='86666666-6666-4666-8666-666666666661';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.reserve_dashboard_help_request('86666666-6666-4666-8666-666666666661')->>'status'<>'denied' THEN RAISE EXCEPTION 'Suspended tenant allowed'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'Dashboard quota, tenant access, privileges, expiration: PASS; fixtures rolled back' AS result;
