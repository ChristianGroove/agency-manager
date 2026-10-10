-- Synthetic fixtures only. No send, provider request or persistent test data.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE caught boolean:=false; BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN IF position(fragment in SQLERRM)=0 THEN RAISE; END IF; caught:=true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Expected rejection: %',statement; END IF; END $$;
SELECT set_config('marketing.test_actor',(SELECT id::text FROM auth.users LIMIT 1),true);
INSERT INTO public.organizations(id,name,slug) VALUES
 ('21000000-0000-4000-8000-000000000001','List fixture','marketing-list-fixture'),
 ('21000000-0000-4000-8000-000000000002','Foreign list fixture','marketing-list-foreign');
INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'owner','active');
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('marketing.test_actor'),'role','service_role')::text,true);
INSERT INTO public.leads(organization_id,name,phone,source,contact_type,status) VALUES
 ('21000000-0000-4000-8000-000000000001','Existing sales lead','573007890001','original','lead','qualified'),
 ('21000000-0000-4000-8000-000000000001','Not in list','573007890003','original','lead','new'),
 ('21000000-0000-4000-8000-000000000002','Foreign contact','573007890004','original','lead','new');
CREATE FUNCTION pg_temp.rows() RETURNS jsonb LANGUAGE sql AS $$ SELECT '[{"row":2,"name":"New marketing contact","phone":"573007890002","email":"","source":"form","evidence":"synthetic reference","occurredAt":"2026-01-01T00:00:00Z"},{"row":3,"name":"Keep existing","phone":"573007890001","email":"","source":"form","evidence":"synthetic reference","occurredAt":"2026-01-01T00:00:00Z"}]'::jsonb $$;
SELECT set_config('marketing.ticket',public.prepare_marketing_import('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,pg_temp.rows())->>'token',true);
SELECT set_config('marketing.outcome',public.confirm_marketing_list_import('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.ticket')::uuid,ARRAY[2,3],'October list')::text,true);
SELECT set_config('marketing.list',(current_setting('marketing.outcome')::jsonb->>'listId'),true);
SELECT pg_temp.assert_true(public.confirm_marketing_list_import('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.ticket')::uuid,ARRAY[3,2],'October list')=current_setting('marketing.outcome')::jsonb,'retry returns same list');
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_list_import('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.ticket')::uuid,ARRAY[2,3],'Changed name')$q$,'selection changed');
SELECT pg_temp.assert_true((SELECT contact_type='prospect' AND status='marketing_contact' FROM public.leads WHERE organization_id='21000000-0000-4000-8000-000000000001' AND phone='573007890002'),'import does not qualify a commercial lead');
SELECT pg_temp.assert_true((SELECT name='Existing sales lead' AND contact_type='lead' AND status='qualified' AND source='original' FROM public.leads WHERE organization_id='21000000-0000-4000-8000-000000000001' AND phone='573007890001'),'existing sales identity and stage preserved');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.marketing_audience_candidates('21000000-0000-4000-8000-000000000001',jsonb_build_object('list_id',current_setting('marketing.list')))),'candidate set contains only exact list');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.marketing_audience_candidates('21000000-0000-4000-8000-000000000001',jsonb_build_object('list_id',current_setting('marketing.list'),'status','qualified'))),'advanced filters narrow list rather than expanding it');
SELECT pg_temp.expect_error($q$SELECT public.marketing_audience_candidates('21000000-0000-4000-8000-000000000002',jsonb_build_object('list_id',current_setting('marketing.list')))$q$,'List unavailable');
SELECT pg_temp.expect_error($q$INSERT INTO public.marketing_contact_list_members(organization_id,list_id,contact_id) SELECT '21000000-0000-4000-8000-000000000001',current_setting('marketing.list')::uuid,id FROM public.leads WHERE organization_id='21000000-0000-4000-8000-000000000002'$q$,'foreign key');
-- A second list reuses the identities and does not overwrite CRM data.
SELECT set_config('marketing.ticket2',public.prepare_marketing_import('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,pg_temp.rows())->>'token',true);
SELECT pg_temp.assert_true((public.confirm_marketing_list_import('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.ticket2')::uuid,ARRAY[2,3],'Second list')->>'created')::integer=0,'lists share contact identities');
SELECT pg_temp.assert_true((SELECT count(*)=4 FROM public.leads WHERE organization_id IN('21000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002')),'no duplicate CRM contacts');
-- Campaign activation freezes the exact selected list. CRM growth outside it is irrelevant.
INSERT INTO public.integration_connections(id,organization_id,provider_key,connection_name,status,credentials,metadata)
 VALUES('23000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','whatsapp_cloud','Synthetic list emitter','active','{}','{"phone_number_id":"synthetic-list-number"}');
SELECT public.store_marketing_channel_probe('21000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','GREEN');
INSERT INTO public.messaging_templates(id,organization_id,channel_id,name,language,content,status,category,meta_id,components)
 VALUES('28000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','fixture_list_promo','es','fixture','APPROVED','MARKETING','fixture-list','[{"type":"BODY","text":"Synthetic list offer"}]');
INSERT INTO public.marketing_campaigns(id,organization_id,name,delivery_config,connection_id)
 VALUES('22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','Synthetic list campaign','{"mode":"growth","humanize":false,"timezone":"America/Bogota"}','23000000-0000-4000-8000-000000000001');
SELECT public.save_marketing_campaign_audience('21000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001',jsonb_build_object('list_id',current_setting('marketing.list')));
INSERT INTO public.marketing_sequences(id,organization_id,campaign_id,name,trigger_type) VALUES('24000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','Principal','manual');
INSERT INTO public.marketing_steps(organization_id,sequence_id,type,name,content) VALUES('21000000-0000-4000-8000-000000000001','24000000-0000-4000-8000-000000000001','whatsapp','Offer','{"template_id":"28000000-0000-4000-8000-000000000001","template_name":"fixture_list_promo","template_language":"es","bindings":{}}');
SELECT set_config('marketing.activation',public.prepare_marketing_activation_review('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'22000000-0000-4000-8000-000000000001')->>'token',true);
SELECT public.record_marketing_consent('21000000-0000-4000-8000-000000000001','573007890003','granted','test','synthetic outside-list permission',clock_timestamp(),current_setting('marketing.test_actor')::uuid);
INSERT INTO public.marketing_contact_list_members(organization_id,list_id,contact_id) SELECT '21000000-0000-4000-8000-000000000001',current_setting('marketing.list')::uuid,id FROM public.leads WHERE organization_id='21000000-0000-4000-8000-000000000001' AND phone='573007890003';
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_activation_review('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'22000000-0000-4000-8000-000000000001',current_setting('marketing.activation')::uuid)$q$,'Recipients changed');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.marketing_enrollments WHERE campaign_id='22000000-0000-4000-8000-000000000001'),'changed list cannot activate stale audience');
DELETE FROM public.marketing_contact_list_members WHERE list_id=current_setting('marketing.list')::uuid AND contact_id IN(SELECT id FROM public.leads WHERE organization_id='21000000-0000-4000-8000-000000000001' AND phone='573007890003');
SELECT set_config('marketing.activation',public.prepare_marketing_activation_review('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'22000000-0000-4000-8000-000000000001')->>'token',true);
SELECT pg_temp.assert_true((public.confirm_marketing_activation_review('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,'22000000-0000-4000-8000-000000000001',current_setting('marketing.activation')::uuid)->>'enrolled')::integer=2,'only reviewed list members enrolled');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.marketing_enrollments WHERE campaign_id='22000000-0000-4000-8000-000000000001' AND recipient='573007890003'),'authorized CRM contact outside list not enrolled');
SELECT pg_temp.assert_true((SELECT contact_type='prospect' AND status='marketing_contact' FROM public.leads WHERE organization_id='21000000-0000-4000-8000-000000000001' AND phone='573007890002'),'activation does not qualify sales contact');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.meta_outbound_outbox WHERE organization_id='21000000-0000-4000-8000-000000000001'),'synthetic test emits no message');
SELECT public.record_marketing_consent('21000000-0000-4000-8000-000000000001','573007890002','revoked','test','synthetic withdrawal',clock_timestamp(),current_setting('marketing.test_actor')::uuid);
SELECT pg_temp.assert_true((public.marketing_audience_summary('21000000-0000-4000-8000-000000000001',jsonb_build_object('list_id',current_setting('marketing.list')))->>'eligible')::integer=1,'list membership cannot bypass withdrawal');
SELECT pg_temp.assert_true(NOT has_function_privilege('authenticated','public.confirm_marketing_list_import(uuid,uuid,uuid,integer[],text)','EXECUTE'),'named confirmation is service only');
SELECT pg_temp.assert_true(NOT has_table_privilege('authenticated','public.marketing_contact_list_members','SELECT'),'no raw list-member leak');
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('marketing.test_actor'),'role','authenticated')::text,true);
INSERT INTO public.marketing_contact_lists(organization_id,name,created_by) SELECT '21000000-0000-4000-8000-000000000001','Page fixture '||n,current_setting('marketing.test_actor')::uuid FROM generate_series(1,21)n;
SELECT pg_temp.assert_true(jsonb_array_length(public.read_marketing_contact_list_page('21000000-0000-4000-8000-000000000001')->'rows')=20,'list page is bounded');
SELECT pg_temp.assert_true(public.read_marketing_contact_list_page('21000000-0000-4000-8000-000000000001')->>'next' IS NOT NULL,'list page supplies keyset cursor');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_contact_list_page('21000000-0000-4000-8000-000000000002')$q$,'access denied');
SELECT pg_temp.assert_true(public.read_marketing_contact_list_page('21000000-0000-4000-8000-000000000001','',NULL,NULL,current_setting('marketing.list')::uuid)->'selected'->>'name'='October list','selected list resolved outside current page');
UPDATE public.organization_members SET permissions='{"marketing.campaigns.import":false}' WHERE organization_id='21000000-0000-4000-8000-000000000001';
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_list_import('21000000-0000-4000-8000-000000000001',current_setting('marketing.test_actor')::uuid,current_setting('marketing.ticket')::uuid,ARRAY[2,3],'October list')$q$,'denied');
ROLLBACK;
