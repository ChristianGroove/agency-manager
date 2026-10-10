-- Synthetic local integration suite. No Graph requests. All changes roll back.
BEGIN;
SET LOCAL request.jwt.claims='{"role":"service_role"}';
CREATE FUNCTION pg_temp.assert_true(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE caught boolean:=false; BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN IF position(fragment in SQLERRM)=0 THEN RAISE; END IF; caught:=true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Expected rejection: %',statement; END IF; END $$;
SELECT set_config('marketing.test_actor',(SELECT id::text FROM auth.users LIMIT 1),true);
INSERT INTO public.organizations(id,name,slug) VALUES('11000000-0000-4000-8000-000000000001','Reviewed operations fixture','reviewed-marketing-fixture');
INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'owner','active');
CREATE FUNCTION pg_temp.rows() RETURNS jsonb LANGUAGE sql AS $$ SELECT '[{"row":2,"name":"New synthetic","phone":"573001234567","email":"","source":"form","evidence":"synthetic reference","occurredAt":"2026-01-01T00:00:00Z"},{"row":3,"name":"Do not overwrite","phone":"573001234568","email":"","source":"form","evidence":"synthetic reference","occurredAt":"2026-01-01T00:00:00Z"}]'::jsonb $$;
INSERT INTO public.leads(organization_id,name,phone,email,source) VALUES('11000000-0000-4000-8000-000000000001','Original name','573001234568','original@example.invalid','original');
SELECT set_config('marketing.import_ticket',public.prepare_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,pg_temp.rows())->>'token',true);
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.leads WHERE organization_id='11000000-0000-4000-8000-000000000001'),'preview creates no contacts');
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_import('11000000-0000-4000-8000-000000000002',current_setting('marketing.test_actor')::uuid,current_setting('marketing.import_ticket')::uuid,ARRAY[2,3])$q$,'denied');
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_import('11000000-0000-4000-8000-000000000001',NULL,current_setting('marketing.import_ticket')::uuid,ARRAY[2,3])$q$,'denied');
UPDATE public.organization_members SET permissions='{"marketing.campaigns.import":false}' WHERE organization_id='11000000-0000-4000-8000-000000000001';
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.import_ticket')::uuid,ARRAY[2,3])$q$,'denied');
UPDATE public.organization_members SET permissions='{}' WHERE organization_id='11000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(public.confirm_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.import_ticket')::uuid,ARRAY[2,3])='{"created":1,"existing":1,"consents":2}'::jsonb,'creates one, preserves one and records two consents');
SELECT pg_temp.assert_true(public.confirm_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.import_ticket')::uuid,ARRAY[3,2])='{"created":1,"existing":1,"consents":2}'::jsonb,'retry returns original result');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.marketing_consent_events WHERE organization_id='11000000-0000-4000-8000-000000000001'),'retry creates no extra evidence');
SELECT pg_temp.assert_true((SELECT name='Original name' AND email='original@example.invalid' AND source='original' FROM public.leads WHERE organization_id='11000000-0000-4000-8000-000000000001' AND phone='573001234568'),'existing CRM data preserved');
SELECT pg_temp.assert_true((SELECT payload='null'::jsonb FROM public.marketing_review_tickets WHERE id=current_setting('marketing.import_ticket')::uuid),'temporary evidence cleared after confirmation');
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.import_ticket')::uuid,ARRAY[2])$q$,'Selection changed');

-- Revocation after review invalidates the entire transaction; no partial contact creation.
SELECT set_config('marketing.changed_ticket',public.prepare_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,jsonb_set(pg_temp.rows(),'{0,phone}','"573001234569"'))->>'token',true);
SELECT public.record_marketing_consent('11000000-0000-4000-8000-000000000001','573001234568','revoked','test','synthetic withdrawal',clock_timestamp()-interval '1 hour',current_setting('marketing.test_actor')::uuid);
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.changed_ticket')::uuid,ARRAY[2,3])$q$,'Recipient changed');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.leads WHERE organization_id='11000000-0000-4000-8000-000000000001' AND phone='573001234569'),'failed batch rolls back earlier rows');
SELECT pg_temp.assert_true((public.prepare_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,pg_temp.rows())->'rows'->1->>'reason')='opted_out','CSV cannot renew withdrawal');
SELECT pg_temp.assert_true((public.prepare_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,jsonb_set(pg_temp.rows(),'{1,phone}','"573001234567"'))->'rows'->0->>'reason')='duplicate','all repeated rows excluded');

-- Renewal requires evidence AFTER withdrawal and exact current recipient state.
UPDATE public.leads SET opted_out_at=clock_timestamp()-interval '1 hour' WHERE organization_id='11000000-0000-4000-8000-000000000001' AND phone='573001234568';
SELECT set_config('marketing.renew_ticket',public.prepare_marketing_renewal('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'573001234568')->>'token',true);
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_renewal('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.renew_ticket')::uuid,'form','synthetic new evidence','2026-01-01T00:00:00Z')$q$,'must follow');
SELECT set_config('marketing.renew_time',(clock_timestamp()-interval '1 minute')::text,true);
SELECT public.confirm_marketing_renewal('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.renew_ticket')::uuid,'form','synthetic new evidence',current_setting('marketing.renew_time')::timestamptz);
SELECT pg_temp.assert_true(public.marketing_recipient_allowed('11000000-0000-4000-8000-000000000001','573001234568'),'explicit renewal restores future permission');
SELECT public.confirm_marketing_renewal('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.renew_ticket')::uuid,'form','synthetic new evidence',current_setting('marketing.renew_time')::timestamptz);
SELECT pg_temp.assert_true((SELECT count(*)=4 FROM public.marketing_consent_events WHERE organization_id='11000000-0000-4000-8000-000000000001'),'renewal retries do not duplicate ledger');
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_renewal('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.renew_ticket')::uuid,'form','changed evidence',current_setting('marketing.renew_time')::timestamptz)$q$,'Renewal changed');
INSERT INTO public.marketing_opt_out_receipts(message_id,organization_id,recipient,rule) VALUES(gen_random_uuid(),'11000000-0000-4000-8000-000000000001','573001234568','explicit_text');
SELECT pg_temp.assert_true(NOT public.marketing_recipient_allowed('11000000-0000-4000-8000-000000000001','573001234568'),'pending withdrawal blocks renewed consent immediately');
SELECT pg_temp.expect_error($q$SELECT public.prepare_marketing_renewal('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'573001234568')$q$,'pending opt-out');

-- Saved-design tickets invalidate on edit, expire, remain actor-scoped and expose no session RPC.
SELECT set_config('marketing.bulk_ticket',public.prepare_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,
 (SELECT jsonb_agg(jsonb_build_object('row',n+1,'name','Synthetic batch '||n,'phone',(573004000000+n)::text,'email','',
 'source','test','evidence','synthetic batch evidence','occurredAt','2026-01-01T00:00:00Z')) FROM generate_series(1,100)n))->>'token',true);
SELECT pg_temp.assert_true((public.confirm_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.bulk_ticket')::uuid,
 (SELECT array_agg(n) FROM generate_series(2,101)n))->>'created')::int=100,'complete bounded batch imports 100 recipients');
INSERT INTO public.marketing_campaigns(id,organization_id,name,delivery_config) VALUES('12000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','Synthetic review','{"mode":"growth","humanize":false,"timezone":"America/Bogota"}');
SELECT set_config('marketing.activation_ticket',public.prepare_marketing_activation_review('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'12000000-0000-4000-8000-000000000001')->>'token',true);
UPDATE public.marketing_campaigns SET delivery_config='{"mode":"stealth","humanize":false,"timezone":"America/Bogota"}' WHERE id='12000000-0000-4000-8000-000000000001';
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_activation_review('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'12000000-0000-4000-8000-000000000001',current_setting('marketing.activation_ticket')::uuid)$q$,'Campaign changed');
UPDATE public.marketing_review_tickets SET expires_at=clock_timestamp()-interval '1 minute' WHERE id=current_setting('marketing.activation_ticket')::uuid;
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_activation_review('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'12000000-0000-4000-8000-000000000001',current_setting('marketing.activation_ticket')::uuid)$q$,'Review expired');
-- A successful final review freezes exactly the approved cohort; additions require another review.
INSERT INTO public.integration_connections(id,organization_id,provider_key,connection_name,status,credentials,metadata)
 VALUES('13000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','whatsapp_cloud','Synthetic emitter','active','{}','{"phone_number_id":"synthetic-reviewed-number"}');
SELECT public.store_marketing_channel_probe('11000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001','GREEN');
INSERT INTO public.messaging_templates(id,organization_id,channel_id,name,language,content,status,category,meta_id,components)
 VALUES('18000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001','fixture_promo','es','fixture','APPROVED','MARKETING','fixture','[{"type":"BODY","text":"Synthetic offer"}]');
INSERT INTO public.marketing_audiences(id,organization_id,name,filter_config) VALUES('19000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','Reviewed cohort','{"source":"marketing_import"}');
UPDATE public.marketing_campaigns SET connection_id='13000000-0000-4000-8000-000000000001',audience_id='19000000-0000-4000-8000-000000000001' WHERE id='12000000-0000-4000-8000-000000000001';
INSERT INTO public.marketing_sequences(id,organization_id,campaign_id,name,trigger_type) VALUES('14000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','Principal','manual');
INSERT INTO public.marketing_steps(organization_id,sequence_id,type,name,content) VALUES('11000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001','whatsapp','Offer','{"template_id":"18000000-0000-4000-8000-000000000001","template_name":"fixture_promo","template_language":"es","bindings":{}}');
SELECT set_config('marketing.activation_ticket',public.prepare_marketing_activation_review('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'12000000-0000-4000-8000-000000000001')->>'token',true);
INSERT INTO public.leads(organization_id,name,phone,source) VALUES('11000000-0000-4000-8000-000000000001','Additional eligible','573001234570','marketing_import');
SELECT public.record_marketing_consent('11000000-0000-4000-8000-000000000001','573001234570','granted','test','synthetic additional evidence',clock_timestamp(),current_setting('marketing.test_actor')::uuid);
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_activation_review('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'12000000-0000-4000-8000-000000000001',current_setting('marketing.activation_ticket')::uuid)$q$,'Recipients changed');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.marketing_enrollments WHERE campaign_id='12000000-0000-4000-8000-000000000001'),'changed cohort creates no enrollments');
SELECT set_config('marketing.activation_ticket',public.prepare_marketing_activation_review('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'12000000-0000-4000-8000-000000000001')->>'token',true);
UPDATE public.organization_members SET role='member',permissions='{"marketing.campaigns.view":true,"marketing.campaigns.execute":true}' WHERE organization_id='11000000-0000-4000-8000-000000000001';
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_activation_review('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'12000000-0000-4000-8000-000000000001',current_setting('marketing.activation_ticket')::uuid)$q$,'channel access denied');
UPDATE public.organization_members SET role='owner',permissions='{}' WHERE organization_id='11000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((public.confirm_marketing_activation_review('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'12000000-0000-4000-8000-000000000001',current_setting('marketing.activation_ticket')::uuid)->>'enrolled')::int=102,'exact reviewed recipients activated');
SELECT public.confirm_marketing_activation_review('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'12000000-0000-4000-8000-000000000001',current_setting('marketing.activation_ticket')::uuid);
SELECT pg_temp.assert_true((SELECT count(*)=102 FROM public.marketing_enrollments WHERE campaign_id='12000000-0000-4000-8000-000000000001'),'activation retry is idempotent');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.meta_outbound_outbox WHERE organization_id='11000000-0000-4000-8000-000000000001'),'SQL activation emits no messages');
SELECT public.record_marketing_consent('11000000-0000-4000-8000-000000000001','573001234567','revoked','test','synthetic cancellation',clock_timestamp()-interval '1 hour',current_setting('marketing.test_actor')::uuid);
UPDATE public.leads SET opted_out_at=clock_timestamp()-interval '1 hour' WHERE organization_id='11000000-0000-4000-8000-000000000001' AND phone='573001234567';
SELECT set_config('marketing.cancelled_ticket',public.prepare_marketing_renewal('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'573001234567')->>'token',true);
SELECT public.confirm_marketing_renewal('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.cancelled_ticket')::uuid,'test','synthetic future permission',clock_timestamp()-interval '1 minute');
SELECT pg_temp.assert_true((SELECT status='cancelled' FROM public.marketing_enrollments WHERE organization_id='11000000-0000-4000-8000-000000000001' AND recipient='573001234567'),'renewal never restarts cancelled enrollment');
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT * FROM public.marketing_review_tickets$q$,'permission denied');
SELECT pg_temp.expect_error($q$SELECT public.prepare_marketing_import('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'[]')$q$,'permission denied');
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_activation_review('11000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'12000000-0000-4000-8000-000000000001',current_setting('marketing.activation_ticket')::uuid)$q$,'permission denied');
RESET ROLE;
ROLLBACK;
