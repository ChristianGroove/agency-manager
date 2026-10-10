-- Contact import and external authorization declaration are separate operations.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE caught boolean:=false; BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN IF position(fragment in SQLERRM)=0 THEN RAISE; END IF; caught:=true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Expected rejection: %',statement; END IF; END $$;
SELECT set_config('marketing.test_actor',(SELECT id::text FROM auth.users LIMIT 1),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('marketing.test_actor'),'role','service_role')::text,true);
INSERT INTO public.organizations(id,name,slug) VALUES('31000000-0000-4000-8000-000000000001','Simple list fixture','marketing-simple-fixture'),('31000000-0000-4000-8000-000000000002','Foreign fixture','marketing-simple-foreign');
INSERT INTO public.organization_members(organization_id,user_id,role,status,permissions) VALUES('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'owner','active','{"marketing.campaigns.execute":false}');
INSERT INTO public.leads(organization_id,name,phone,status,contact_type) VALUES('31000000-0000-4000-8000-000000000001','Preserve sales lead','573008900001','qualified','lead');
SELECT public.record_marketing_consent('31000000-0000-4000-8000-000000000001','573008900001','revoked','test','synthetic prior withdrawal',clock_timestamp(),current_setting('marketing.test_actor')::uuid);
CREATE FUNCTION pg_temp.rows() RETURNS jsonb LANGUAGE sql AS $$ SELECT '[{"row":2,"name":"New synthetic","phone":"573008900002","email":""},{"row":3,"name":"Do not overwrite","phone":"573008900001","email":""},{"row":4,"name":"Duplicate new","phone":"573008900002","email":""}]'::jsonb $$;
SELECT set_config('marketing.simple_review',public.prepare_marketing_contact_import('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,pg_temp.rows())::text,true);
SELECT pg_temp.assert_true(current_setting('marketing.simple_review')::jsonb->'rows'->2->>'reason'='duplicate','duplicate rows keep only first occurrence');
SELECT pg_temp.assert_true(current_setting('marketing.simple_review')::jsonb->'rows'->1->>'reason'='contact_withdrawn','withdrawn contacts can be stored without receiving permission');
SELECT set_config('marketing.simple_ticket',current_setting('marketing.simple_review')::jsonb->>'token',true);
SELECT set_config('marketing.simple_result',public.confirm_marketing_contact_import('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.simple_ticket')::uuid,ARRAY[2,3],'Simple list')::text,true);
SELECT set_config('marketing.simple_list',current_setting('marketing.simple_result')::jsonb->>'listId',true);
SELECT pg_temp.assert_true(current_setting('marketing.simple_result')::jsonb->>'consents'='0','raw contact import creates no permission');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.marketing_consent_events WHERE organization_id='31000000-0000-4000-8000-000000000001'),'no manufactured consent event');
SELECT pg_temp.assert_true(NOT public.marketing_recipient_allowed('31000000-0000-4000-8000-000000000001','573008900002'),'plain import does not allow sending');
SELECT pg_temp.assert_true((SELECT name='Preserve sales lead' AND status='qualified' AND contact_type='lead' AND marketing_opted_out IS TRUE FROM public.leads WHERE organization_id='31000000-0000-4000-8000-000000000001' AND phone='573008900001'),'CRM identity and withdrawal preserved');
SELECT pg_temp.assert_true(public.confirm_marketing_contact_import('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.simple_ticket')::uuid,ARRAY[3,2],'Simple list')=current_setting('marketing.simple_result')::jsonb,'raw import retry is idempotent');
SELECT pg_temp.expect_error($q$SELECT public.prepare_marketing_list_authorization('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.simple_list')::uuid)$q$,'denied');
UPDATE public.organization_members SET permissions='{}' WHERE organization_id='31000000-0000-4000-8000-000000000001';
SELECT set_config('marketing.list_review',public.prepare_marketing_list_authorization('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.simple_list')::uuid)::text,true);
SELECT pg_temp.assert_true(current_setting('marketing.list_review')::jsonb->>'toAuthorize'='1','declaration excludes prior withdrawals');
SELECT set_config('marketing.list_ticket',current_setting('marketing.list_review')::jsonb->>'token',true);
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_list_authorization('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.list_ticket')::uuid,false)$q$,'Explicit declaration required');
SELECT pg_temp.expect_error($q$SELECT public.prepare_marketing_list_authorization('31000000-0000-4000-8000-000000000002',current_setting('marketing.test_actor')::uuid,current_setting('marketing.simple_list')::uuid)$q$,'denied');
SELECT pg_temp.assert_true(public.confirm_marketing_list_authorization('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.list_ticket')::uuid,true,'')='{"authorized":1}'::jsonb,'one explicit declaration records permission without mandatory reference');
SELECT public.confirm_marketing_list_authorization('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.list_ticket')::uuid,true,'');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.marketing_consent_events WHERE organization_id='31000000-0000-4000-8000-000000000001'),'declaration retries do not duplicate audit');
SELECT pg_temp.assert_true(public.marketing_recipient_allowed('31000000-0000-4000-8000-000000000001','573008900002'),'explicit external declaration allows new contact');
SELECT pg_temp.assert_true(NOT public.marketing_recipient_allowed('31000000-0000-4000-8000-000000000001','573008900001'),'declaration cannot reverse withdrawal');
SELECT pg_temp.assert_true((SELECT source='external_batch_declaration' AND evidence LIKE '%no fecha original%' AND recorded_by=current_setting('marketing.test_actor')::uuid FROM public.marketing_consent_events WHERE organization_id='31000000-0000-4000-8000-000000000001' AND event='granted'),'audit describes a declaration rather than fabricated original evidence');
-- Large import is bounded and shares exactly 1000 identities; all changes roll back.
SELECT set_config('marketing.large_ticket',public.prepare_marketing_contact_import('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,
 (SELECT jsonb_agg(jsonb_build_object('row',n+1,'name','Synthetic '||n,'phone',(573009000000+n)::text,'email','')) FROM generate_series(1,1000)n))->>'token',true);
SELECT set_config('marketing.large_result',public.confirm_marketing_contact_import('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.large_ticket')::uuid,(SELECT array_agg(n) FROM generate_series(2,1001)n),'Large list')::text,true);
SELECT pg_temp.assert_true(current_setting('marketing.large_result')::jsonb->>'created'='1000','full 1000-contact import succeeds');
SELECT set_config('marketing.large_declaration',public.prepare_marketing_list_authorization('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,(current_setting('marketing.large_result')::jsonb->>'listId')::uuid)->>'token',true);
SELECT public.record_marketing_consent('31000000-0000-4000-8000-000000000001','573009000001','revoked','test','synthetic withdrawal after review',clock_timestamp(),current_setting('marketing.test_actor')::uuid);
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_list_authorization('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.large_declaration')::uuid,true)$q$,'permission changed');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.marketing_consent_events WHERE organization_id='31000000-0000-4000-8000-000000000001' AND event='granted'),'stale batch rolls back all grants');
SELECT set_config('marketing.large_declaration',public.prepare_marketing_list_authorization('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,(current_setting('marketing.large_result')::jsonb->>'listId')::uuid)->>'token',true);
UPDATE public.organization_members SET permissions='{"marketing.campaigns.execute":false}' WHERE organization_id='31000000-0000-4000-8000-000000000001';
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_list_authorization('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.large_declaration')::uuid,true)$q$,'denied');
UPDATE public.organization_members SET permissions='{}' WHERE organization_id='31000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(public.confirm_marketing_list_authorization('31000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.large_declaration')::uuid,true)='{"authorized":999}'::jsonb,'large declaration authorizes all pending recipients except withdrawal');
SELECT pg_temp.assert_true((SELECT count(*)=1000 FROM public.marketing_consent_events WHERE organization_id='31000000-0000-4000-8000-000000000001' AND event='granted'),'batch grants exactly the eligible contacts');
SELECT pg_temp.assert_true(NOT public.marketing_recipient_allowed('31000000-0000-4000-8000-000000000001','573009000001'),'large declaration preserves withdrawal');
SELECT pg_temp.assert_true(NOT has_function_privilege('authenticated','public.confirm_marketing_contact_import(uuid,uuid,uuid,integer[],text)','EXECUTE'),'raw confirm is service only');
SELECT pg_temp.assert_true(NOT has_function_privilege('authenticated','public.confirm_marketing_list_authorization(uuid,uuid,uuid,boolean,text)','EXECUTE'),'declaration confirm is service only');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.meta_outbound_outbox WHERE organization_id='31000000-0000-4000-8000-000000000001'),'test sends no messages');
ROLLBACK;
