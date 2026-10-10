-- Docker only. Synthetic fixtures, no Graph requests; all changes roll back.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE caught boolean:=false; BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN IF position(fragment in SQLERRM)=0 THEN RAISE; END IF; caught:=true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Expected rejection: %',statement; END IF; END $$;
SELECT set_config('marketing.test_user',(SELECT id::text FROM auth.users LIMIT 1),true);
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
INSERT INTO public.organizations(id,name,slug) VALUES
 ('15000000-0000-4000-8000-000000000001','Workspace fixture','workspace-marketing-fixture'),
 ('15000000-0000-4000-8000-000000000002','Foreign workspace fixture','foreign-workspace-marketing-fixture');
INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES
 ('15000000-0000-4000-8000-000000000001',current_setting('marketing.test_user')::uuid,'owner','active');
INSERT INTO public.marketing_campaigns(id,organization_id,name,created_at)
 SELECT ('16000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'15000000-0000-4000-8000-000000000001','Synthetic campaign '||n,'2026-01-01'::timestamptz FROM generate_series(1,23) n;
INSERT INTO public.marketing_campaigns(id,organization_id,name) VALUES
 ('16000000-0000-4000-8000-000000000099','15000000-0000-4000-8000-000000000002','Foreign synthetic');
SET LOCAL ROLE authenticated;
SELECT set_config('marketing.page',public.read_marketing_campaign_page('15000000-0000-4000-8000-000000000001')::text,true);
SELECT pg_temp.assert_true(jsonb_array_length(current_setting('marketing.page')::jsonb->'rows')=20,'bounded first page');
SELECT pg_temp.assert_true(current_setting('marketing.page')::jsonb#>>'{rows,0,id}'='16000000-0000-4000-8000-000000000023','deterministic tie ordering');
SELECT set_config('marketing.next',public.read_marketing_campaign_page('15000000-0000-4000-8000-000000000001','', 'all',NULL,
 (current_setting('marketing.page')::jsonb#>>'{next,createdAt}')::timestamptz,(current_setting('marketing.page')::jsonb#>>'{next,id}')::uuid)::text,true);
SELECT pg_temp.assert_true(jsonb_array_length(current_setting('marketing.next')::jsonb->'rows')=3 AND current_setting('marketing.next')::jsonb->'next'='null'::jsonb,'second page without overlap');
SELECT pg_temp.assert_true(jsonb_array_length(public.read_marketing_campaign_page('15000000-0000-4000-8000-000000000001','campaign 23')->'rows')=1,'literal search');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_campaign_page('15000000-0000-4000-8000-000000000002')$q$,'access denied');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_campaign_page('15000000-0000-4000-8000-000000000001','','invalid')$q$,'Invalid campaign page');
RESET ROLE;
INSERT INTO public.marketing_audiences(id,organization_id,name,filter_config) VALUES
 ('17000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','Shared original','{"has_phone":true,"source":"original","created_after":"2025-01-01T00:00:00Z"}');
UPDATE public.marketing_campaigns SET audience_id='17000000-0000-4000-8000-000000000001' WHERE id IN('16000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000002');
SET LOCAL ROLE authenticated;
SELECT set_config('marketing.private_audience',public.save_marketing_campaign_audience('15000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001','{"has_phone":true,"source":"marketing_import","created_after":"2025-01-01T00:00:00Z"}')::text,true);
SELECT pg_temp.assert_true(current_setting('marketing.private_audience')<>'17000000-0000-4000-8000-000000000001','editing clones shared audience');
SELECT pg_temp.assert_true(public.read_marketing_campaign_audience('15000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000002')#>>'{filters,source}'='original','other campaign remains unchanged');
SELECT pg_temp.assert_true(public.save_marketing_campaign_audience('15000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001','{"has_phone":true,"status":"new"}')::text=current_setting('marketing.private_audience'),'subsequent edits reuse private audience');
SELECT pg_temp.assert_true(jsonb_array_length(public.read_marketing_audience_page('15000000-0000-4000-8000-000000000001')->'rows')=1,'private campaign filters not shown as reusable segments');
SELECT pg_temp.expect_error($q$SELECT public.save_marketing_campaign_audience('15000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000099','{}')$q$,'Campaign must be a draft');
RESET ROLE;
SELECT set_config('request.jwt.claims',json_build_object('role','service_role','sub',current_setting('marketing.test_user'))::text,true);
UPDATE public.marketing_campaigns SET status='paused' WHERE id='16000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.save_marketing_campaign_audience('15000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001','{}')$q$,'Campaign must be a draft');
SELECT pg_temp.assert_true(public.read_marketing_campaign_page('15000000-0000-4000-8000-000000000001','','paused')#>>'{rows,0,status}'='paused','real paused state');
RESET ROLE;
INSERT INTO public.integration_connections(id,organization_id,provider_key,connection_name,status,credentials,metadata) VALUES
 ('18000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','whatsapp_cloud','Synthetic number','active','{}','{}');
UPDATE public.marketing_campaigns SET connection_id='18000000-0000-4000-8000-000000000001' WHERE id='16000000-0000-4000-8000-000000000003';
SELECT set_config('request.jwt.claims',json_build_object('role','service_role','sub',current_setting('marketing.test_user'))::text,true);
INSERT INTO public.marketing_sequences(id,organization_id,campaign_id,name,trigger_type,is_active) VALUES
 ('19000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000003','Synthetic sequence','manual',true);
INSERT INTO public.leads(id,organization_id,name,phone) VALUES
 ('20000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','Synthetic recipient','11234567890');
INSERT INTO public.marketing_enrollments(id,organization_id,campaign_id,sequence_id,contact_id,recipient,status) VALUES
 ('21000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000003','19000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','11234567890','completed');
-- These are synthetic historical records, never queued or dispatched.
INSERT INTO public.meta_outbound_outbox(organization_id,connection_id,operation_key,recipient,content,sender,channel,status,external_id) VALUES
 ('15000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000001','campaign:21000000-0000-4000-8000-000000000001:22000000-0000-4000-8000-000000000001','11234567890','{}','agent','whatsapp','accepted','synthetic-receipt');
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
SET LOCAL ROLE authenticated;
SELECT set_config('marketing.metrics',public.read_marketing_campaign_page('15000000-0000-4000-8000-000000000001','campaign 3')::text,true);
SELECT pg_temp.assert_true(current_setting('marketing.metrics')::jsonb#>>'{rows,0,recipients}'='1' AND current_setting('marketing.metrics')::jsonb#>>'{rows,0,completed}'='1','recipient progress uses enrollment states');
SELECT pg_temp.assert_true(current_setting('marketing.metrics')::jsonb#>>'{rows,0,accepted}'='1' AND current_setting('marketing.metrics')::jsonb#>>'{rows,0,delivered}'='0','acceptance is not delivery');
RESET ROLE;
INSERT INTO public.meta_message_statuses(connection_id,organization_id,external_id,status,event_timestamp) VALUES
 ('18000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','synthetic-receipt','read',now());
SET LOCAL ROLE authenticated;
SELECT set_config('marketing.metrics',public.read_marketing_campaign_page('15000000-0000-4000-8000-000000000001','campaign 3')::text,true);
SELECT pg_temp.assert_true(current_setting('marketing.metrics')::jsonb#>>'{rows,0,delivered}'='1' AND current_setting('marketing.metrics')::jsonb#>>'{rows,0,read}'='1','read receipts also count as delivered');
RESET ROLE;
UPDATE public.organization_members SET role='member',permissions='{"marketing.campaigns.view":true,"marketing.campaigns.manage":true,"inbox_access":[]}' WHERE organization_id='15000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true(jsonb_array_length(public.read_marketing_campaign_page('15000000-0000-4000-8000-000000000001','campaign 3')->'rows')=0,'unauthorized channel omitted');
SELECT pg_temp.expect_error($q$SELECT public.save_marketing_campaign_audience('15000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000003','{}')$q$,'Channel access denied');
RESET ROLE;
UPDATE public.organization_members SET status='pending' WHERE organization_id='15000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_campaign_page('15000000-0000-4000-8000-000000000001')$q$,'access denied');
RESET ROLE;
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.meta_outbound_outbox WHERE organization_id='15000000-0000-4000-8000-000000000001' AND status IN ('queued','sending')),'no messages queued');
ROLLBACK;
