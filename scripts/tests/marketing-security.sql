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
UPDATE public.organization_members SET status='pending' WHERE organization_id='01000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(NOT public.marketing_has_permission('01000000-0000-4000-8000-000000000001','execute'),'pending invitation does not grant access');
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
INSERT INTO public.marketing_steps(id,organization_id,sequence_id,name,type,order_index,content) VALUES
 ('05000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000001','Fixture WhatsApp','whatsapp',0,'{"template_id":"08000000-0000-4000-8000-000000000001","template_name":"fixture_promo","template_language":"es","bindings":{}}');
SELECT pg_temp.expect_error($q$INSERT INTO public.marketing_steps(organization_id,sequence_id,name,type) VALUES ('01000000-0000-4000-8000-000000000002','04000000-0000-4000-8000-000000000001','Foreign step','delay')$q$,'Invalid marketing sequence');
INSERT INTO public.leads(id,organization_id,name,phone,marketing_opted_out) VALUES
 ('06000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','Synthetic recipient','11234567890',false);
INSERT INTO public.marketing_enrollments(id,organization_id,campaign_id,sequence_id,current_step_id,contact_id,recipient,next_run_at) VALUES
 ('07000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000001','05000000-0000-4000-8000-000000000001','06000000-0000-4000-8000-000000000001','11234567890',now()-interval '1 minute');
SELECT pg_temp.expect_error($q$INSERT INTO public.marketing_enrollments(organization_id,campaign_id,sequence_id,current_step_id,contact_id,recipient) VALUES ('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000001','05000000-0000-4000-8000-000000000001','06000000-0000-4000-8000-000000000001','11234567890')$q$,'marketing_campaign_recipient_unique');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.claim_marketing_enrollments(25)),'draft campaign is not claimed');

-- No implicit opt-in; summaries operate over every matching row.
SELECT pg_temp.assert_true((public.marketing_audience_summary('01000000-0000-4000-8000-000000000001','{}')->>'missingConsent')::int=1,'old lead is not consent');
INSERT INTO public.leads(organization_id,name,phone,score) SELECT '01000000-0000-4000-8000-000000000001','Synthetic duplicate '||n,'+1 (123) 456-7890',0 FROM generate_series(1,1100) n;
SELECT pg_temp.assert_true((public.marketing_audience_summary('01000000-0000-4000-8000-000000000001','{"score_min":0,"score_max":0}')->>'matched')::int=1101,'preview is not truncated at 1000');
SELECT pg_temp.expect_error($q$SELECT public.marketing_audience_summary('01000000-0000-4000-8000-000000000001','{"last_contact_after":"2026-01-01"}')$q$,'Invalid audience filters');
SELECT public.record_marketing_consent('01000000-0000-4000-8000-000000000001','11234567890','granted','synthetic_fixture','Not a real recipient',now(),current_setting('marketing.test_user')::uuid);

SELECT pg_temp.assert_true((public.marketing_audience_summary('01000000-0000-4000-8000-000000000001','{}')->>'eligible')::int=1,'one recipient despite 1101 contacts');
SELECT pg_temp.assert_true((public.marketing_audience_summary('01000000-0000-4000-8000-000000000001','{}')->>'duplicates')::int=1100,'duplicates excluded from recipient count');
-- Atomic quick draft: simulate a failure in the last write.
INSERT INTO public.messaging_templates(id,organization_id,channel_id,name,language,content,status,category,meta_id,components)
VALUES('08000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','fixture_promo','es','fixture','APPROVED','MARKETING','fixture','[{"type":"BODY","text":"Oferta"}]');
CREATE FUNCTION pg_temp.reject_fixture_broadcast() RETURNS trigger LANGUAGE plpgsql AS $q$
BEGIN IF NEW.name='Atomic rollback fixture' THEN RAISE EXCEPTION 'Synthetic final-write failure'; END IF; RETURN NEW; END $q$;
CREATE TRIGGER marketing_atomic_test BEFORE INSERT ON public.broadcasts FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_fixture_broadcast();
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.record_marketing_consent('01000000-0000-4000-8000-000000000001','11234567890','granted','form','reference',now(),auth.uid())$q$,'permission denied');
SELECT pg_temp.expect_error($q$SELECT public.marketing_audience_summary('01000000-0000-4000-8000-000000000002','{}')$q$,'Marketing access denied');
SELECT pg_temp.expect_error($q$SELECT public.create_marketing_quick_draft('01000000-0000-4000-8000-000000000001','Atomic rollback fixture','03000000-0000-4000-8000-000000000001','08000000-0000-4000-8000-000000000001','{"template_id":"08000000-0000-4000-8000-000000000001","template_name":"fixture_promo","template_language":"es","bindings":{}}','{}','{"mode":"growth","humanize":false,"timezone":"America/Bogota"}')$q$,'Synthetic final-write failure');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE name='Atomic rollback fixture'),'no partial campaign');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.marketing_audiences WHERE name='Atomic rollback fixture · destinatarios'),'no orphan audience');
SELECT set_config('marketing.test_draft',(public.create_marketing_quick_draft('01000000-0000-4000-8000-000000000001','Atomic success fixture','03000000-0000-4000-8000-000000000001','08000000-0000-4000-8000-000000000001','{"template_id":"08000000-0000-4000-8000-000000000001","template_name":"fixture_promo","template_language":"es","bindings":{}}','{}','{"mode":"growth","humanize":false,"timezone":"America/Bogota"}')).id::text,true);
SELECT pg_temp.assert_true((public.read_marketing_preflight('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_draft')::uuid)->'audience'->>'eligible')::int=1,'draft has linked audience and summary');
SELECT pg_temp.assert_true((SELECT connection_id='03000000-0000-4000-8000-000000000001' AND status='draft' AND execution_version IS NULL FROM public.marketing_campaigns WHERE id=current_setting('marketing.test_draft')::uuid),'draft does not enroll or activate');
INSERT INTO public.marketing_sequences(id,organization_id,campaign_id,name,trigger_type,is_active)
VALUES('04000000-0000-4000-8000-000000000003','01000000-0000-4000-8000-000000000001',current_setting('marketing.test_draft')::uuid,'Alternative','manual',true);
SELECT pg_temp.assert_true((SELECT NOT is_active FROM public.marketing_sequences WHERE id='04000000-0000-4000-8000-000000000003'),'second flow does not silently become principal');
SELECT public.set_marketing_principal('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_draft')::uuid,'04000000-0000-4000-8000-000000000003');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.marketing_sequences WHERE campaign_id=current_setting('marketing.test_draft')::uuid AND is_active),'principal switch is exclusive');
SELECT pg_temp.expect_error($q$SELECT public.set_marketing_principal('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_draft')::uuid,'04000000-0000-4000-8000-000000000001')$q$,'Invalid marketing sequence');
RESET ROLE;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
-- Gaps after deleting a step must not reuse a surviving position.
INSERT INTO public.marketing_steps(organization_id,sequence_id,name,type,order_index) VALUES
('01000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000001','Second','delay',0),
('01000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000001','Third','delay',0);
DELETE FROM public.marketing_steps WHERE sequence_id='04000000-0000-4000-8000-000000000001' AND name='Second';
INSERT INTO public.marketing_steps(organization_id,sequence_id,name,type) VALUES ('01000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000001','Fourth','delay');
SELECT pg_temp.assert_true((SELECT order_index=3 FROM public.marketing_steps WHERE sequence_id='04000000-0000-4000-8000-000000000001' AND name='Fourth'),'new step uses max+1, not count');
UPDATE public.marketing_campaigns SET status='active',execution_version=2 WHERE id='02000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.claim_marketing_enrollments(25)),'active campaign can be claimed once');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.claim_marketing_enrollments(25)),'a second worker cannot take an unexpired lease');
SELECT pg_temp.expect_error($q$UPDATE public.marketing_steps SET name='mutated' WHERE id='05000000-0000-4000-8000-000000000001'$q$,'Only draft campaigns');
SELECT pg_temp.assert_true(public.marketing_outbound_allowed('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','campaign:07000000-0000-4000-8000-000000000001:05000000-0000-4000-8000-000000000001'),'active dispatch gate');
UPDATE public.messaging_templates SET status='PAUSED' WHERE id='08000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(NOT public.marketing_outbound_allowed('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','campaign:07000000-0000-4000-8000-000000000001:05000000-0000-4000-8000-000000000001'),'paused template blocks recovery');
UPDATE public.messaging_templates SET status='APPROVED' WHERE id='08000000-0000-4000-8000-000000000001';
UPDATE public.integration_connections SET status='disconnected' WHERE id='03000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(NOT public.marketing_outbound_allowed('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','campaign:07000000-0000-4000-8000-000000000001:05000000-0000-4000-8000-000000000001'),'disconnected channel blocks recovery');
UPDATE public.integration_connections SET status='active' WHERE id='03000000-0000-4000-8000-000000000001';
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

SELECT public.record_marketing_consent('01000000-0000-4000-8000-000000000001','11234567890','revoked','fixture','Synthetic opt-out',now(),current_setting('marketing.test_user')::uuid);
SELECT pg_temp.assert_true((SELECT status='cancelled' AND claim_token IS NULL FROM public.marketing_enrollments WHERE id='07000000-0000-4000-8000-000000000001'),'revocation cancels enrollment and lease');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.leads WHERE organization_id='01000000-0000-4000-8000-000000000001' AND marketing_opted_out IS NOT TRUE),'all duplicate contacts revoked');
SELECT pg_temp.assert_true(NOT public.marketing_recipient_allowed('01000000-0000-4000-8000-000000000001','11234567890'),'latest revocation blocks recipient');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.marketing_consent_events WHERE organization_id='01000000-0000-4000-8000-000000000001'),'evidence history retained');
SELECT pg_temp.expect_error($q$SELECT public.record_marketing_consent('01000000-0000-4000-8000-000000000001','11234567890','granted','import','Old grant',now()-interval '1 day',NULL)$q$,'explicit renewal');

INSERT INTO public.leads(id,organization_id,name,phone) VALUES('06000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000001','Malformed-phone opt-out fixture','123');
SELECT public.revoke_marketing_contact('01000000-0000-4000-8000-000000000001','06000000-0000-4000-8000-000000000002',current_setting('marketing.test_user')::uuid);
SELECT pg_temp.assert_true((SELECT marketing_opted_out FROM public.leads WHERE id='06000000-0000-4000-8000-000000000002'),'malformed phone does not prevent opt-out');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.marketing_consent_events WHERE contact_id='06000000-0000-4000-8000-000000000002' AND event='revoked'),'malformed-phone opt-out retains evidence');
ROLLBACK;
