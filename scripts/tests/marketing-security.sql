-- Local Docker integration test. Every fixture and change is rolled back.
-- psql -v ON_ERROR_STOP=1 < scripts/tests/marketing-security.sql
BEGIN;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
CREATE FUNCTION pg_temp.assert_true(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text, fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE caught boolean := false; BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN
   IF position(fragment in SQLERRM)=0 THEN RAISE; END IF; caught := true;
 END;
 IF NOT caught THEN RAISE EXCEPTION 'Expected rejection: %',statement; END IF;
END $$;

SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM auth.users), 'requires a seeded local user');
SELECT set_config('marketing.test_user',(SELECT id::text FROM auth.users LIMIT 1),true);
INSERT INTO public.organizations(id,name,slug) VALUES
 ('01000000-0000-4000-8000-000000000001','Marketing security fixture A','marketing-security-fixture-a'),
 ('01000000-0000-4000-8000-000000000002','Marketing security fixture B','marketing-security-fixture-b');
INSERT INTO public.organization_members(organization_id,user_id,role) VALUES
 ('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_user')::uuid,'owner');
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
SELECT pg_temp.assert_true(public.marketing_has_permission('01000000-0000-4000-8000-000000000001','execute'),'owner can control their tenant');
SELECT pg_temp.assert_true(NOT public.marketing_has_permission('01000000-0000-4000-8000-000000000002','view'),'foreign tenant denied');
UPDATE public.organization_members SET status='blocked'
 WHERE organization_id='01000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(NOT public.marketing_has_permission('01000000-0000-4000-8000-000000000001','execute'),'blocked owner denied');
UPDATE public.organization_members SET status='active',permissions='{"marketing.campaigns.execute":false}'
 WHERE organization_id='01000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(NOT public.marketing_has_permission('01000000-0000-4000-8000-000000000001','execute'),'explicit denial wins');
UPDATE public.organization_members SET permissions='{}'
 WHERE organization_id='01000000-0000-4000-8000-000000000001';

INSERT INTO public.marketing_campaigns(id,organization_id,name) VALUES
 ('02000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','Fixture A'),
 ('02000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000002','Fixture B');
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.marketing_campaigns WHERE id IN ('02000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000002')),'RLS excludes foreign campaigns');
SELECT pg_temp.expect_error($q$UPDATE public.marketing_campaigns SET status='active' WHERE id='02000000-0000-4000-8000-000000000001'$q$,'authorized marketing control');
SELECT pg_temp.expect_error($q$SELECT * FROM public.claim_marketing_enrollments(25)$q$,'permission denied');
RESET ROLE;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';

INSERT INTO public.integration_connections(id,organization_id,provider_key,connection_name,status,credentials) VALUES
 ('03000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','whatsapp_cloud','Synthetic channel A','active','{}'),
 ('03000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000002','whatsapp_cloud','Synthetic channel B','active','{}');
SELECT pg_temp.expect_error($q$UPDATE public.marketing_campaigns SET connection_id='03000000-0000-4000-8000-000000000002' WHERE id='02000000-0000-4000-8000-000000000001'$q$,'Invalid marketing channel');
UPDATE public.marketing_campaigns SET connection_id='03000000-0000-4000-8000-000000000001'
 WHERE id='02000000-0000-4000-8000-000000000001';
INSERT INTO public.marketing_sequences(id,organization_id,campaign_id,name,trigger_type,is_active) VALUES
 ('04000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000001','Fixture sequence','manual',true);
INSERT INTO public.marketing_steps(id,organization_id,sequence_id,name,type,order_index) VALUES
 ('05000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000001','Fixture delay','delay',0);
SELECT pg_temp.expect_error($q$INSERT INTO public.marketing_steps(organization_id,sequence_id,name,type) VALUES ('01000000-0000-4000-8000-000000000002','04000000-0000-4000-8000-000000000001','Foreign step','delay')$q$,'Invalid marketing sequence');
INSERT INTO public.leads(id,organization_id,name,phone,marketing_opted_out) VALUES
 ('06000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','Synthetic recipient','11234567890',false);
INSERT INTO public.marketing_enrollments(id,organization_id,campaign_id,sequence_id,current_step_id,contact_id,recipient,next_run_at) VALUES
 ('07000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000001','05000000-0000-4000-8000-000000000001','06000000-0000-4000-8000-000000000001','11234567890',now()-interval '1 minute');
SELECT pg_temp.expect_error($q$INSERT INTO public.marketing_enrollments(organization_id,campaign_id,sequence_id,current_step_id,contact_id,recipient) VALUES ('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000001','05000000-0000-4000-8000-000000000001','06000000-0000-4000-8000-000000000001','11234567890')$q$,'marketing_campaign_recipient_unique');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.claim_marketing_enrollments(25)),'draft campaign is not claimed');
UPDATE public.marketing_campaigns SET status='active',execution_version=2 WHERE id='02000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.claim_marketing_enrollments(25)),'active campaign can be claimed once');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.claim_marketing_enrollments(25)),'a second worker cannot take an unexpired lease');
SELECT pg_temp.expect_error($q$UPDATE public.marketing_steps SET name='mutated' WHERE id='05000000-0000-4000-8000-000000000001'$q$,'Only draft campaigns');
SELECT pg_temp.assert_true(public.marketing_outbound_allowed('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','campaign:07000000-0000-4000-8000-000000000001:05000000-0000-4000-8000-000000000001'),'active dispatch gate');
UPDATE public.marketing_campaigns SET status='paused' WHERE id='02000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(NOT public.marketing_outbound_allowed('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','campaign:07000000-0000-4000-8000-000000000001:05000000-0000-4000-8000-000000000001'),'pause blocks outbox recovery');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.claim_marketing_enrollments(25)),'paused campaign is not claimed');
SELECT pg_temp.expect_error($q$DELETE FROM public.marketing_campaigns WHERE id='02000000-0000-4000-8000-000000000001'$q$,'Only draft campaigns');
-- Draft deletion must still support cascading sequence/step cleanup.
INSERT INTO public.marketing_sequences(id,organization_id,campaign_id,name,trigger_type) VALUES
 ('04000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000002','02000000-0000-4000-8000-000000000002','Cascade fixture','manual');
INSERT INTO public.marketing_steps(id,organization_id,sequence_id,name,type) VALUES
 ('05000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000002','04000000-0000-4000-8000-000000000002','Cascade step','delay');
DELETE FROM public.marketing_campaigns WHERE id='02000000-0000-4000-8000-000000000002';
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.marketing_steps WHERE id='05000000-0000-4000-8000-000000000002'),'draft child cascade remains usable');
ROLLBACK;
