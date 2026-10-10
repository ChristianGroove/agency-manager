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
SELECT public.store_marketing_channel_probe('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','GREEN');
SELECT public.store_marketing_channel_probe('01000000-0000-4000-8000-000000000002','03000000-0000-4000-8000-000000000002','GREEN');
SELECT pg_temp.expect_error($q$UPDATE public.marketing_campaigns SET connection_id='03000000-0000-4000-8000-000000000002' WHERE id='02000000-0000-4000-8000-000000000001'$q$,'Invalid marketing channel');
UPDATE public.marketing_campaigns SET connection_id='03000000-0000-4000-8000-000000000001',delivery_config='{"mode":"growth","humanize":false,"timezone":"America/Bogota"}'
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

-- Transactional activation and physical-number pacing. These operations never call Meta.
SELECT pg_temp.assert_true(public.marketing_schedule_open('{"mode":"growth","timezone":"America/Bogota","schedule_window":{"start":9,"end":17}}','2026-10-09 14:00Z'),'Bogota window opens at local 09');
SELECT pg_temp.assert_true(NOT public.marketing_schedule_open('{"mode":"growth","timezone":"America/Bogota","schedule_window":{"start":9,"end":17}}','2026-10-09 22:00Z'),'closing hour is excluded');
SELECT pg_temp.assert_true(NOT public.marketing_schedule_open('{"mode":"growth","timezone":"Invalid/Zone"}',now()),'invalid zone fails closed');
SELECT pg_temp.assert_true(public.marketing_schedule_open('{"mode":"growth","timezone":"America/New_York","schedule_window":{"start":1,"end":2}}','2026-11-01 06:30Z'),'DST repeated local hour is allowed');
UPDATE public.integration_connections SET metadata='{"phone_number_id":"synthetic-number-stage3"}' WHERE id='03000000-0000-4000-8000-000000000001';
INSERT INTO public.marketing_audiences(id,organization_id,name,filter_config) VALUES('09000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','Activation fixture','{}');
INSERT INTO public.marketing_campaigns(id,organization_id,name,connection_id,audience_id,delivery_config)
VALUES('02000000-0000-4000-8000-000000000003','01000000-0000-4000-8000-000000000001','Activation fixture','03000000-0000-4000-8000-000000000001','09000000-0000-4000-8000-000000000001','{"mode":"growth","humanize":false,"timezone":"America/Bogota"}');
INSERT INTO public.marketing_sequences(id,organization_id,campaign_id,name,trigger_type) VALUES('04000000-0000-4000-8000-000000000004','01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003','Activation sequence','manual');
INSERT INTO public.marketing_steps(id,organization_id,sequence_id,name,type,content) VALUES('05000000-0000-4000-8000-000000000004','01000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000004','Activation template','whatsapp','{"template_id":"08000000-0000-4000-8000-000000000001","template_name":"fixture_promo","template_language":"es","bindings":{}}');
SELECT set_config('marketing.test_fingerprint',public.read_marketing_activation('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003')->>'fingerprint',true);
SELECT pg_temp.expect_error($q$SELECT public.activate_marketing_campaign('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003','stale',current_setting('marketing.test_user')::uuid)$q$,'Campaign changed');
SELECT pg_temp.expect_error($q$SELECT public.activate_marketing_campaign('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003',current_setting('marketing.test_fingerprint'),NULL)$q$,'execution denied');
CREATE FUNCTION pg_temp.reject_fixture_activation() RETURNS trigger LANGUAGE plpgsql AS $q$
BEGIN IF NEW.name='Activation fixture' AND NEW.execution_version=2 THEN RAISE EXCEPTION 'Synthetic activation failure'; END IF; RETURN NEW; END $q$;
CREATE TRIGGER marketing_activation_test BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_fixture_activation();
SELECT pg_temp.expect_error($q$SELECT public.activate_marketing_campaign('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003',current_setting('marketing.test_fingerprint'),current_setting('marketing.test_user')::uuid)$q$,'Synthetic activation failure');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.marketing_enrollments WHERE campaign_id='02000000-0000-4000-8000-000000000003'),'activation final-write failure leaves no recipients');
DROP TRIGGER marketing_activation_test ON public.marketing_campaigns;
SELECT pg_temp.assert_true((public.activate_marketing_campaign('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003',current_setting('marketing.test_fingerprint'),current_setting('marketing.test_user')::uuid)->>'enrolled')::int=1,'activation deduplicates 1101 contacts');
SELECT pg_temp.assert_true((public.activate_marketing_campaign('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003',current_setting('marketing.test_fingerprint'),current_setting('marketing.test_user')::uuid)->>'enrolled')::int=0,'duplicate activation is idempotent');
UPDATE public.marketing_audiences SET filter_config='{"source":"non_matching_fixture"}' WHERE id='09000000-0000-4000-8000-000000000001';
SELECT set_config('marketing.test_fingerprint',public.read_marketing_activation('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003')->>'fingerprint',true);
UPDATE public.marketing_campaigns SET status='paused' WHERE id='02000000-0000-4000-8000-000000000003';
SELECT pg_temp.assert_true((public.activate_marketing_campaign('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003',current_setting('marketing.test_fingerprint'),current_setting('marketing.test_user')::uuid)->>'resumed')::boolean,'resume preserves recipients');
SELECT pg_temp.assert_true((SELECT count(*)=1 AND bool_and(recipient_snapshot IS NOT NULL) FROM public.marketing_enrollments WHERE campaign_id='02000000-0000-4000-8000-000000000003'),'resume does not duplicate enrollment or overwrite recipient data');
SELECT pg_temp.expect_error($q$UPDATE public.marketing_enrollments SET recipient_snapshot='{}' WHERE campaign_id='02000000-0000-4000-8000-000000000003'$q$,'snapshot is immutable');
SELECT pg_temp.expect_error($q$UPDATE public.marketing_campaigns SET execution_snapshot='{}' WHERE id='02000000-0000-4000-8000-000000000003'$q$,'execution is immutable');
SELECT set_config('marketing.test_conversation',public.marketing_get_conversation('01000000-0000-4000-8000-000000000001','06000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','11234567890')::text,true);
SELECT pg_temp.assert_true(public.marketing_get_conversation('01000000-0000-4000-8000-000000000001','06000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','11234567890')=current_setting('marketing.test_conversation')::uuid,'conversation creation is idempotent');
SELECT pg_temp.expect_error($q$SELECT public.marketing_get_conversation('01000000-0000-4000-8000-000000000002','06000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','11234567890')$q$,'context unavailable');
UPDATE public.marketing_campaigns SET status='active' WHERE id='02000000-0000-4000-8000-000000000001';
UPDATE public.marketing_enrollments SET claim_token=NULL,claimed_until=NULL WHERE campaign_id='02000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.claim_marketing_enrollments(25)),'one number cannot occupy the whole claim batch across campaigns');
SELECT set_config('marketing.test_operation','campaign:'||(SELECT id::text FROM public.marketing_enrollments WHERE campaign_id='02000000-0000-4000-8000-000000000003')||':05000000-0000-4000-8000-000000000004',true);
SELECT set_config('marketing.test_outbox',(SELECT outbox_id::text FROM public.enqueue_meta_outbound('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',NULL,NULL,current_setting('marketing.test_operation'),'11234567890','{"type":"template","templateName":"fixture_promo"}','System','whatsapp')),true);
UPDATE public.meta_outbound_outbox SET status='sending' WHERE id=current_setting('marketing.test_outbox')::uuid;
SELECT pg_temp.assert_true((public.reserve_marketing_dispatch('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',current_setting('marketing.test_operation'),current_setting('marketing.test_outbox')::uuid)->>'allowed')::boolean,'first operation reserves a number slot');
SELECT set_config('marketing.test_outbox2',(SELECT outbox_id::text FROM public.enqueue_meta_outbound('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',NULL,NULL,'campaign:07000000-0000-4000-8000-000000000001:05000000-0000-4000-8000-000000000001','11234567890','{"type":"template","templateName":"fixture_promo"}','System','whatsapp')),true);
UPDATE public.meta_outbound_outbox SET status='sending' WHERE id=current_setting('marketing.test_outbox2')::uuid;
SELECT pg_temp.assert_true(NOT (public.reserve_marketing_dispatch('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','campaign:07000000-0000-4000-8000-000000000001:05000000-0000-4000-8000-000000000001',current_setting('marketing.test_outbox2')::uuid)->>'allowed')::boolean,'different campaigns cannot spend the same number slot');
SELECT pg_temp.assert_true((SELECT next_dispatch_at>clock_timestamp()+interval '25 seconds' FROM public.marketing_number_pacing WHERE number_key='synthetic-number-stage3'),'minimum pacing persists in SQL');
UPDATE public.marketing_campaigns SET status='paused' WHERE id='02000000-0000-4000-8000-000000000001';
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
-- Stage 4: durable opt-out requests block marketing immediately, independently of Inbox processing.
SELECT pg_temp.assert_true(public.marketing_opt_out_rule(NULL,'  ¡No quiero recibir más promociones!  ')='explicit_text','clear Spanish opt-out');
SELECT pg_temp.assert_true(public.marketing_opt_out_rule('BAJA_PROMOCIONES','Otro texto')='button','dedicated button payload');
SELECT pg_temp.assert_true(public.marketing_opt_out_rule(NULL,'no') IS NULL AND public.marketing_opt_out_rule(NULL,'cancelar pedido') IS NULL,'ordinary replies are not opt-outs');
INSERT INTO public.leads(id,organization_id,name,phone,marketing_opted_out) VALUES
 ('06000000-0000-4000-8000-000000000003','01000000-0000-4000-8000-000000000001','Incoming opt-out fixture','573006705958',false),
 ('06000000-0000-4000-8000-000000000004','01000000-0000-4000-8000-000000000002','Foreign opt-out fixture','573006705958',false);
SELECT set_config('marketing.test_optout_conversation',public.marketing_get_conversation('01000000-0000-4000-8000-000000000001','06000000-0000-4000-8000-000000000003','03000000-0000-4000-8000-000000000001','573006705958')::text,true);
INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,external_id,metadata) VALUES
 ('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_optout_conversation')::uuid,'whatsapp','inbound','received','{"type":"text","text":"no"}','wamid.stage4.normal','{"from":"573006705958"}'),
 ('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_optout_conversation')::uuid,'whatsapp','inbound','received','{"type":"text","text":"STOP"}','wamid.stage4.history','{"from":"573006705958","metadata":{"historical":true}}'),
 ('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_optout_conversation')::uuid,'whatsapp','outbound','sent','{"type":"text","text":"STOP"}','wamid.stage4.echo','{"from":"573006705958","origin":"outbound","is_echo":true}');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.marketing_opt_out_receipts WHERE organization_id='01000000-0000-4000-8000-000000000001'),'normal, historical and echo messages do not revoke');
SELECT public.record_marketing_consent('01000000-0000-4000-8000-000000000001','573006705958','granted','fixture','Explicit fixture consent',now(),NULL);
SELECT pg_temp.assert_true(public.marketing_recipient_allowed('01000000-0000-4000-8000-000000000001','573006705958'),'recipient is allowed before requesting a withdrawal');
CREATE FUNCTION pg_temp.reject_optout_event() RETURNS trigger LANGUAGE plpgsql AS $q$
BEGIN IF NEW.source='whatsapp_inbound' THEN RAISE EXCEPTION 'Synthetic opt-out failure'; END IF; RETURN NEW; END $q$;
CREATE TRIGGER marketing_optout_failure_test BEFORE INSERT ON public.marketing_consent_events FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_optout_event();
INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,external_id,metadata) VALUES('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_optout_conversation')::uuid,'whatsapp','inbound','received','{"type":"text","text":"STOP"}','wamid.stage4.retry','{"from":"573006705958"}');
SELECT pg_temp.assert_true(NOT public.marketing_recipient_allowed('01000000-0000-4000-8000-000000000001','573006705958'),'pending opt-out blocks marketing immediately');
SELECT pg_temp.assert_true((public.process_marketing_opt_out_requests(5)->>'failed')::int=1,'failed preference update is reported for retry');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.messages WHERE external_id='wamid.stage4.retry' AND status='received'),'preference failure preserves Inbox reception');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.marketing_opt_out_receipts WHERE recipient='573006705958' AND processed_at IS NULL AND attempts=1 AND retry_at>clock_timestamp()),'failed request remains durable with a delayed retry');
SELECT pg_temp.assert_true((SELECT NOT marketing_opted_out FROM public.leads WHERE id='06000000-0000-4000-8000-000000000003'),'failed update does not leave a partial revocation');
SELECT pg_temp.assert_true(NOT public.marketing_recipient_allowed('01000000-0000-4000-8000-000000000001','573006705958'),'failed processing still blocks future marketing');
DELETE FROM public.messages WHERE external_id='wamid.stage4.retry';
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.marketing_opt_out_receipts WHERE recipient='573006705958' AND processed_at IS NULL),'deleting Inbox history preserves the pending withdrawal');
SELECT pg_temp.assert_true(NOT public.marketing_recipient_allowed('01000000-0000-4000-8000-000000000001','573006705958'),'history deletion cannot restore consent');
DROP TRIGGER marketing_optout_failure_test ON public.marketing_consent_events;
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,external_id,metadata) VALUES('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_optout_conversation')::uuid,'whatsapp','inbound','received','{"type":"text","text":"STOP"}','wamid.stage4.untrusted','{"from":"573006705958"}');
SELECT pg_temp.assert_true((SELECT NOT marketing_opted_out FROM public.leads WHERE id='06000000-0000-4000-8000-000000000003'),'client-crafted incoming records cannot forge a marketing revocation');
SET LOCAL request.jwt.claims='{"role":"service_role"}';
INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,external_id,metadata) VALUES('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_optout_conversation')::uuid,'whatsapp','inbound','received','{"type":"text","text":"Dejar de recibir"}','wamid.stage4.live','{"from":"573006705958","buttonId":"BAJA_PROMOCIONES"}');
SELECT pg_temp.assert_true((public.process_marketing_opt_out_requests(1,(SELECT id FROM public.messages WHERE external_id='wamid.stage4.live'))->>'processed')::int=1,'post-persist processing handles the dedicated button');
UPDATE public.marketing_opt_out_receipts SET retry_at=clock_timestamp() WHERE recipient='573006705958' AND processed_at IS NULL;
SELECT pg_temp.assert_true((public.process_marketing_opt_out_requests(5)->>'processed')::int=1,'maintenance processes the previous failed request');
SELECT pg_temp.assert_true((public.process_marketing_opt_out_requests(5)->>'processed')::int=0,'processed requests are idempotent');
SELECT pg_temp.assert_true((SELECT marketing_opted_out FROM public.leads WHERE id='06000000-0000-4000-8000-000000000003'),'live button revokes the sender');
SELECT pg_temp.assert_true((SELECT NOT marketing_opted_out FROM public.leads WHERE id='06000000-0000-4000-8000-000000000004'),'same phone in another tenant is unchanged');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.marketing_opt_out_receipts WHERE recipient='573006705958'),'one audit receipt per distinct live request');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.messages WHERE external_id='wamid.stage4.live' AND status='received'),'incoming opt-out remains an ordinary received Inbox message');
SELECT pg_temp.expect_error($q$INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,external_id,metadata) VALUES('01000000-0000-4000-8000-000000000001',current_setting('marketing.test_optout_conversation')::uuid,'whatsapp','inbound','received','{"type":"text","text":"STOP"}','wamid.stage4.live','{"from":"573006705958"}')$q$,'duplicate key');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.marketing_opt_out_receipts WHERE recipient='573006705958'),'duplicate webhook cannot duplicate consent evidence');

-- Campaign completion is processing completion; unsettled outcomes remain open.
SELECT pg_temp.assert_true(public.finalize_marketing_campaigns(25)=0,'sending operations prevent campaign closure');
UPDATE public.meta_outbound_outbox SET status='unknown' WHERE id=current_setting('marketing.test_outbox')::uuid;
SELECT pg_temp.assert_true(public.finalize_marketing_campaigns(25)=0,'unknown results prevent false completion');
SELECT pg_temp.assert_true((public.read_marketing_campaign_metrics('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003')->'delivery'->>'unknown')::int=1,'unknown outcome visible in campaign metrics');
INSERT INTO public.messages(id,organization_id,conversation_id,channel,direction,status,content,external_id) VALUES('0a000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001',current_setting('marketing.test_conversation')::uuid,'whatsapp','outbound','delivered','{"type":"text","text":"Synthetic receipt"}','wamid.stage4.receipt');
UPDATE public.meta_outbound_outbox SET status='accepted',external_id='wamid.stage4.receipt',message_id='0a000000-0000-4000-8000-000000000001' WHERE id=current_setting('marketing.test_outbox')::uuid;
SELECT pg_temp.assert_true((public.read_marketing_campaign_metrics('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003')->'delivery'->>'accepted')::int=1,'acceptance is counted per campaign');
SELECT pg_temp.assert_true((public.read_marketing_campaign_metrics('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003')->'delivery'->>'delivered')::int=1,'delivered receipt is counted');
UPDATE public.messages SET status='read' WHERE id='0a000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((public.read_marketing_campaign_metrics('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003')->'delivery'->>'read')::int=1,'read receipt is separate');
UPDATE public.messages SET status='failed' WHERE id='0a000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((public.read_marketing_campaign_metrics('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003')->'delivery'->>'failed')::int=1,'provider failure after acceptance remains visible');
SELECT pg_temp.assert_true(public.finalize_marketing_campaigns(25)=1,'resolved terminal campaign closes');
SELECT pg_temp.assert_true((SELECT status='completed' FROM public.marketing_campaigns WHERE id='02000000-0000-4000-8000-000000000003'),'processing terminal state saved');
SELECT pg_temp.assert_true((SELECT status='paused' FROM public.marketing_campaigns WHERE id='02000000-0000-4000-8000-000000000001'),'sweep preserves a user pause');
SELECT pg_temp.assert_true(public.finalize_marketing_campaigns(25)=0,'repeated finalization is idempotent');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_campaign_metrics('01000000-0000-4000-8000-000000000002','02000000-0000-4000-8000-000000000003')$q$,'Campaign not found');
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true((public.read_marketing_campaign_metrics('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003')->'stats'->>'total')::int=1,'member can read campaign metrics in their tenant');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_campaign_metrics('01000000-0000-4000-8000-000000000002','02000000-0000-4000-8000-000000000002')$q$,'Marketing access denied');
SELECT pg_temp.expect_error($q$SELECT public.process_marketing_opt_out_requests(5)$q$,'permission denied');
SELECT pg_temp.expect_error($q$SELECT public.finalize_marketing_campaigns(25)$q$,'permission denied');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.marketing_opt_out_receipts),'RLS exposes only this tenant withdrawal receipts');
RESET ROLE;
-- Stage 5: readiness and holds are Marketing-only and require current evidence.
SET LOCAL request.jwt.claims='{"role":"service_role"}';
SELECT pg_temp.assert_true(public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'fresh positive quality permits marketing');
SELECT pg_temp.assert_true(NOT public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000002','03000000-0000-4000-8000-000000000001'),'foreign channel cannot share readiness');
SELECT public.record_meta_message_status('03000000-0000-4000-8000-000000000001',jsonb_build_object('id','wamid.stage5.preack','status','failed','timestamp',extract(epoch FROM clock_timestamp())::text,'errors',jsonb_build_array(jsonb_build_object('code',131048))));
SELECT pg_temp.assert_true(public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'unmatched receipt does not invent campaign attribution');
UPDATE public.meta_outbound_outbox SET status='accepted',external_id='wamid.stage5.preack' WHERE id=current_setting('marketing.test_outbox2')::uuid;
SELECT pg_temp.assert_true(NOT public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'failure received before local acknowledgement still holds marketing');
SELECT public.acknowledge_marketing_channel_hold('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',current_setting('marketing.test_user')::uuid,(SELECT held_at FROM public.marketing_channel_health WHERE connection_id='03000000-0000-4000-8000-000000000001'));
UPDATE public.marketing_channel_health SET checked_at=clock_timestamp()-interval '25 hours' WHERE connection_id='03000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(NOT public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'expired evidence cannot authorize sends');
SELECT public.store_marketing_channel_probe('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','RED');
SELECT pg_temp.assert_true(NOT public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'red quality blocks marketing');
SELECT public.store_marketing_channel_probe('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','GREEN');
UPDATE public.meta_outbound_outbox SET status='failed',error_kind='meta_131049' WHERE id=current_setting('marketing.test_outbox2')::uuid;
SELECT pg_temp.assert_true(public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'recipient rejection does not block every campaign');
UPDATE public.meta_outbound_outbox SET error_kind='meta_131048' WHERE id=current_setting('marketing.test_outbox2')::uuid;
SELECT pg_temp.assert_true(NOT public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'confirmed number rejection holds marketing');
SELECT pg_temp.assert_true(public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000002','03000000-0000-4000-8000-000000000002'),'hold does not affect another tenant');
SELECT pg_temp.assert_true((SELECT status='active' FROM public.integration_connections WHERE id='03000000-0000-4000-8000-000000000001'),'marketing hold preserves Inbox connection status');
SELECT public.store_marketing_channel_probe('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','GREEN');
SELECT pg_temp.assert_true(NOT public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'quality probe does not silently clear a restriction');
SELECT pg_temp.expect_error($q$SELECT public.acknowledge_marketing_channel_hold('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',gen_random_uuid(),now())$q$,'Marketing execution denied');
SELECT pg_temp.expect_error($q$SELECT public.acknowledge_marketing_channel_hold('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',current_setting('marketing.test_user')::uuid,now()-interval '1 day')$q$,'Refresh channel');
SELECT public.acknowledge_marketing_channel_hold('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',current_setting('marketing.test_user')::uuid,(SELECT held_at FROM public.marketing_channel_health WHERE connection_id='03000000-0000-4000-8000-000000000001'));
SELECT pg_temp.assert_true(public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'explicit current review releases the hold');
SELECT public.hold_marketing_channel('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',131048,now()-interval '1 hour');
SELECT pg_temp.assert_true(public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'late old failure cannot undo a newer review');
SELECT public.hold_marketing_channel('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',130429,clock_timestamp());
SELECT pg_temp.assert_true(NOT public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'throughput hold defers marketing');
UPDATE public.marketing_channel_health SET hold_until=clock_timestamp()-interval '1 second' WHERE connection_id='03000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(public.marketing_channel_dispatch_open('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001'),'elapsed cooldown does not require a manual override');
SELECT public.hold_marketing_channel('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',131048,clock_timestamp());
SELECT public.hold_marketing_channel('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',130429,clock_timestamp());
SELECT pg_temp.assert_true((SELECT hold_code=131048 AND hold_until IS NULL FROM public.marketing_channel_health WHERE connection_id='03000000-0000-4000-8000-000000000001'),'cooldown cannot weaken an unresolved review hold');
SELECT public.acknowledge_marketing_channel_hold('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',current_setting('marketing.test_user')::uuid,(SELECT held_at FROM public.marketing_channel_health WHERE connection_id='03000000-0000-4000-8000-000000000001'));
UPDATE public.marketing_campaigns SET status='active' WHERE id='02000000-0000-4000-8000-000000000001';
UPDATE public.marketing_channel_health SET checked_at=clock_timestamp()-interval '2 hours' WHERE connection_id='03000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.claim_marketing_health_probes(3)),'renewal acquires only active due channels');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.claim_marketing_health_probes(3)),'renewal lease prevents concurrent duplicate probes');
SELECT public.store_marketing_channel_probe('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','GREEN');
SELECT pg_temp.assert_true((SELECT probe_claimed_until IS NULL FROM public.marketing_channel_health WHERE connection_id='03000000-0000-4000-8000-000000000001'),'persisted renewal releases its lease');
SELECT set_config('marketing.test_run',public.record_marketing_worker_run()::text,true);
SELECT public.record_marketing_worker_run(current_setting('marketing.test_run')::uuid,'{"processed":2,"failed":1,"secret":"must not persist"}',true);
SELECT pg_temp.assert_true((SELECT status='failed' AND NOT result ? 'secret' FROM public.marketing_worker_runs WHERE id=current_setting('marketing.test_run')::uuid),'worker evidence preserves truthful result and removes unrelated data');
SELECT pg_temp.assert_true(public.read_marketing_campaign_metrics('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003')->'runtime'->>'status'='failed','failure is visible in campaign metrics');
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.store_marketing_channel_probe('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','GREEN')$q$,'permission denied');
SELECT pg_temp.expect_error($q$SELECT public.marketing_outbound_allowed_before_health('01000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001','campaign:fake')$q$,'permission denied');
SELECT pg_temp.expect_error($q$SELECT public.record_marketing_worker_run()$q$,'permission denied');
RESET ROLE;
-- Stage 6: keyset reports cover all recipients without returning private payloads or raw logs.
SET LOCAL request.jwt.claims='{"role":"service_role"}';
INSERT INTO public.marketing_campaigns(id,organization_id,name,connection_id) VALUES
 ('02000000-0000-4000-8000-000000000006','01000000-0000-4000-8000-000000000001','History fixture','03000000-0000-4000-8000-000000000001');
INSERT INTO public.marketing_sequences(id,organization_id,campaign_id,name,trigger_type,is_active) VALUES
 ('04000000-0000-4000-8000-000000000006','01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006','History sequence','manual',true);
INSERT INTO public.marketing_steps(id,organization_id,sequence_id,name,type,content) VALUES
 ('05000000-0000-4000-8000-000000000006','01000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000006','First template','whatsapp','{"template_name":"synthetic_template"}'),
 ('05000000-0000-4000-8000-000000000007','01000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000006','Wait','delay','{}'),
 ('05000000-0000-4000-8000-000000000008','01000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000006','Last template','whatsapp','{"template_name":"synthetic_template"}');
INSERT INTO public.marketing_enrollments(id,organization_id,campaign_id,sequence_id,current_step_id,contact_id,recipient,recipient_snapshot,status,last_error,execution_logs)
SELECT ('17000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'01000000-0000-4000-8000-000000000001',
 '02000000-0000-4000-8000-000000000006','04000000-0000-4000-8000-000000000006','05000000-0000-4000-8000-000000000007',
 '06000000-0000-4000-8000-000000000001','1999'||lpad(n::text,7,'0'),jsonb_build_object('name','Immutable recipient '||n),
 CASE WHEN n=1 THEN 'failed' ELSE 'active' END,'private_access_token=never_export','[{"secret":"never_export"}]' FROM generate_series(1,1105) n;
SELECT set_config('marketing.test_history',public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_limit=>100)::text,true);
SELECT pg_temp.assert_true((current_setting('marketing.test_history')::jsonb->>'total')::int=1105,'history count is not truncated at 1000');
SELECT pg_temp.assert_true(jsonb_array_length(current_setting('marketing.test_history')::jsonb->'items')=100,'recipient page remains bounded');
SELECT pg_temp.assert_true(current_setting('marketing.test_history')::jsonb->>'nextCursor'='17000000-0000-4000-8000-000000000100','keyset cursor is the last visible row');
SELECT pg_temp.assert_true(position('never_export' IN current_setting('marketing.test_history'))=0,'raw error logs are not serialized');
SELECT pg_temp.assert_true(public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_after=>'17000000-0000-4000-8000-000000000100',p_limit=>100)->'items'->0->>'id'='17000000-0000-4000-8000-000000000101','second page neither skips nor duplicates cursor row');
DO $$ DECLARE page jsonb; cursor uuid; seen uuid[]:='{}'; item jsonb; BEGIN
 LOOP
  page:=public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_after=>cursor,p_limit=>100);
  FOR item IN SELECT * FROM jsonb_array_elements(page->'items') LOOP
   IF (item->>'id')::uuid=ANY(seen) THEN RAISE EXCEPTION 'Duplicate report row'; END IF;
   seen:=array_append(seen,(item->>'id')::uuid);
  END LOOP;
  EXIT WHEN NOT (page->>'hasMore')::boolean;
  cursor:=(page->>'nextCursor')::uuid;
 END LOOP;
 PERFORM pg_temp.assert_true(cardinality(seen)=1105,'all rows are reachable through recipient pagination');
END $$;
SELECT pg_temp.assert_true((public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_status=>'failed')->>'total')::int=1,'execution filter is exact');
SELECT pg_temp.assert_true((public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_search=>'%')->>'total')::int=0,'search is literal, not wildcard syntax');
SELECT pg_temp.assert_true((public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_search=>'19990001105')->>'total')::int=1,'phone search reaches rows beyond the REST page limit');
SELECT set_config('marketing.test_steps',public.read_marketing_step_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006','17000000-0000-4000-8000-000000000001',p_limit=>2)::text,true);
SELECT pg_temp.assert_true(current_setting('marketing.test_steps')::jsonb->'items'->0->>'progress'='advanced','sequence advance is separate from delivery evidence');
SELECT pg_temp.assert_true(current_setting('marketing.test_steps')::jsonb->'items'->0->>'delivery'='not_started','a processed step without an outbox is not invented as delivered');
SELECT pg_temp.assert_true(jsonb_array_length(public.read_marketing_step_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006','17000000-0000-4000-8000-000000000001',p_after=>current_setting('marketing.test_steps')::jsonb->'nextCursor',p_limit=>2)->'items')=1,'step keyset reaches the final step without repeating the delay');
DO $$ DECLARE page jsonb; cursor jsonb; seen text[]:='{}'; item jsonb; row_key text; BEGIN
 LOOP
  page:=public.read_marketing_step_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_after=>cursor,p_limit=>100);
  FOR item IN SELECT * FROM jsonb_array_elements(page->'items') LOOP
   row_key:=item->>'enrollment_id'||':'||(item->>'step_id');
   IF row_key=ANY(seen) THEN RAISE EXCEPTION 'Duplicate step report row'; END IF;
   seen:=array_append(seen,row_key);
  END LOOP;
  EXIT WHEN NOT (page->>'hasMore')::boolean;
  cursor:=page->'nextCursor';
 END LOOP;
 PERFORM pg_temp.assert_true(cardinality(seen)=3315,'whole-campaign step export reaches every recipient and step');
END $$;
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM jsonb_array_elements(public.read_marketing_step_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000001')->'items') row WHERE row->>'error_code'='131048'),'step detail exposes numeric provider rejection only');
SELECT pg_temp.assert_true((public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000003',p_delivery=>'failed')->>'total')::int=1,'failed receipt is searchable after acceptance');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_history('01000000-0000-4000-8000-000000000002','02000000-0000-4000-8000-000000000006')$q$,'Campaign not found');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_step_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006','07000000-0000-4000-8000-000000000001')$q$,'Recipient not found');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_limit=>101)$q$,'Invalid report filters');
UPDATE public.organization_members SET permissions='{"marketing.campaigns.export":false}' WHERE organization_id='01000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true((public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006')->>'total')::int=1105,'authorized viewer can read without export');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_export=>true)$q$,'Marketing report access denied');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_step_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_export=>true)$q$,'Marketing report access denied');
SELECT pg_temp.expect_error($q$SELECT * FROM public.marketing_history_matches('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006','all','','all')$q$,'permission denied');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_history('01000000-0000-4000-8000-000000000002','02000000-0000-4000-8000-000000000002')$q$,'Marketing report access denied');
RESET ROLE;
UPDATE public.organization_members SET role='member',permissions='{"marketing.campaigns.view":true,"marketing.campaigns.export":true}' WHERE organization_id='01000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006')$q$,'Marketing channel access denied');
RESET ROLE;
UPDATE public.organization_members SET permissions='{"marketing.campaigns.view":true,"marketing.campaigns.export":true,"inbox_access":["03000000-0000-4000-8000-000000000001"]}' WHERE organization_id='01000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true((public.read_marketing_history('01000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000006',p_export=>true)->>'total')::int=1105,'assigned channel and both report permissions allow export');
RESET ROLE;
ROLLBACK;
