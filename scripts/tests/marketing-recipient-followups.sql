-- Synthetic local fixtures. No provider calls; every change rolls back.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',label; END IF; END $$;
SELECT set_config('guard.actor',(SELECT id::text FROM auth.users LIMIT 1),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('guard.actor'),'role','service_role')::text,true);
INSERT INTO public.organizations(id,name,slug) VALUES('41000000-0000-4000-8000-000000000001','Guard fixture','guard-fixture'),('41000000-0000-4000-8000-000000000002','Foreign guard','guard-foreign');
INSERT INTO public.organization_members(organization_id,user_id,role,status) SELECT id,current_setting('guard.actor')::uuid,'owner','active' FROM public.organizations WHERE slug IN('guard-fixture','guard-foreign');
INSERT INTO public.integration_connections(id,organization_id,provider_key,connection_name,status,credentials,metadata) VALUES
 ('42000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','whatsapp_cloud','Guard A','active','{}','{"phone_number_id":"guard-number-a"}'),
 ('42000000-0000-4000-8000-000000000002','41000000-0000-4000-8000-000000000001','whatsapp_cloud','Guard B','active','{}','{"phone_number_id":"guard-number-b"}'),
 ('42000000-0000-4000-8000-000000000003','41000000-0000-4000-8000-000000000002','whatsapp_cloud','Guard C','active','{}','{"phone_number_id":"guard-number-c"}');
INSERT INTO public.messaging_templates(id,organization_id,channel_id,name,language,content,status,category,meta_id,components)
 SELECT ('43000000-0000-4000-8000-00000000000'||n)::uuid,organization_id,id,'guard_promo','es','synthetic','APPROVED','MARKETING','fixture','[{"type":"BODY","text":"Synthetic offer"}]' FROM public.integration_connections CROSS JOIN LATERAL (SELECT right(id::text,1)::integer n) ids WHERE id::text LIKE '42000000-%';
INSERT INTO public.leads(organization_id,name,phone,source,marketing_opted_out) SELECT id,'Synthetic guard','573006705958','guard_fixture',false FROM public.organizations WHERE slug IN('guard-fixture','guard-foreign');
SELECT public.record_marketing_consent(id,'573006705958','granted','test','Synthetic consent',clock_timestamp(),current_setting('guard.actor')::uuid) FROM public.organizations WHERE slug IN('guard-fixture','guard-foreign');
SELECT public.store_marketing_channel_probe(organization_id,id,'GREEN') FROM public.integration_connections WHERE id::text LIKE '42000000-%';
CREATE FUNCTION pg_temp.campaign(org uuid,connection uuid,hours integer) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE camp public.marketing_campaigns; template uuid; seq uuid;
BEGIN
 SELECT id INTO template FROM public.messaging_templates WHERE organization_id=org AND channel_id=connection;
 SELECT * INTO camp FROM public.create_marketing_quick_draft(org,'Synthetic guard campaign',connection,template,
 jsonb_build_object('template_id',template,'template_name','guard_promo','template_language','es','bindings','{}'::jsonb),'{"source":"guard_fixture"}',
 jsonb_build_object('mode','growth','humanize',false,'timezone','America/Bogota','recipient_cooldown_hours',hours));
 SELECT id INTO seq FROM public.marketing_sequences WHERE campaign_id=camp.id;
 INSERT INTO public.marketing_steps(organization_id,sequence_id,name,type,order_index,content) VALUES(org,seq,'Followup','whatsapp',1,jsonb_build_object('template_id',template,'template_name','guard_promo','template_language','es','bindings','{}'::jsonb));
 PERFORM public.activate_marketing_campaign(org,camp.id,public.read_marketing_activation(org,camp.id)->>'fingerprint',current_setting('guard.actor')::uuid);
 RETURN camp.id;
END $$;
CREATE FUNCTION pg_temp.op(camp uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'campaign:'||id::text||':'||current_step_id::text FROM public.marketing_enrollments WHERE campaign_id=camp $$;
CREATE FUNCTION pg_temp.box(camp uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE e public.marketing_enrollments; connection uuid; cv uuid; result uuid;
BEGIN
 SELECT * INTO e FROM public.marketing_enrollments WHERE campaign_id=camp;
 SELECT connection_id INTO connection FROM public.marketing_campaigns WHERE id=camp;
 cv:=public.marketing_get_conversation(e.organization_id,e.contact_id,connection,e.recipient);
 SELECT outbox_id INTO result FROM public.enqueue_meta_outbound(e.organization_id,connection,cv,NULL,pg_temp.op(camp),e.recipient,'{"type":"template"}','System','whatsapp');
 UPDATE public.meta_outbound_outbox SET status='sending',claimed_at=clock_timestamp() WHERE id=result;
 RETURN result;
END $$;
CREATE FUNCTION pg_temp.reserve(camp uuid,box uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT public.reserve_marketing_dispatch(organization_id,connection_id,pg_temp.op(id),box) FROM public.marketing_campaigns WHERE id=camp $$;
SELECT set_config('guard.a',pg_temp.campaign('41000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001',24)::text,true);
SELECT set_config('guard.b',pg_temp.campaign('41000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000002',0)::text,true);
SELECT set_config('guard.c',pg_temp.campaign('41000000-0000-4000-8000-000000000002','42000000-0000-4000-8000-000000000003',0)::text,true);
SELECT set_config('guard.boxa',pg_temp.box(current_setting('guard.a')::uuid)::text,true);
SELECT set_config('guard.boxb',pg_temp.box(current_setting('guard.b')::uuid)::text,true);
SELECT pg_temp.assert_true(pg_temp.reserve(current_setting('guard.a')::uuid,current_setting('guard.boxa')::uuid)->>'allowed'='true','first campaign reserves recipient');
SELECT pg_temp.assert_true(pg_temp.reserve(current_setting('guard.b')::uuid,current_setting('guard.boxb')::uuid)->>'reason'='recipient_unconfirmed','another number cannot race an in-flight dispatch');
SELECT public.finish_meta_outbound(current_setting('guard.boxa')::uuid,'accepted','wamid.guard-a');
SELECT pg_temp.assert_true(pg_temp.reserve(current_setting('guard.b')::uuid,current_setting('guard.boxb')::uuid)->>'reason'='recipient_frequency','prior campaign wait applies even when next campaign uses zero');
SELECT set_config('guard.boxc',pg_temp.box(current_setting('guard.c')::uuid)::text,true);
SELECT pg_temp.assert_true(pg_temp.reserve(current_setting('guard.c')::uuid,current_setting('guard.boxc')::uuid)->>'allowed'='true','same recipient in another tenant remains independent');
-- Same campaign followup is not delayed by its own inter-campaign wait.
UPDATE public.marketing_enrollments e SET current_step_id=s.id FROM public.marketing_steps s WHERE e.campaign_id=current_setting('guard.a')::uuid AND s.sequence_id=e.sequence_id AND s.order_index=1;
UPDATE public.marketing_number_pacing SET next_dispatch_at=clock_timestamp()-interval '1 second' WHERE number_key='guard-number-a';
SELECT set_config('guard.followup',pg_temp.box(current_setting('guard.a')::uuid)::text,true);
SELECT pg_temp.assert_true(pg_temp.reserve(current_setting('guard.a')::uuid,current_setting('guard.followup')::uuid)->>'allowed'='true','own followup honors sequence and number pacing rather than inter-campaign wait');
SELECT public.finish_meta_outbound(current_setting('guard.followup')::uuid,'failed',NULL,'synthetic_failure');
SELECT pg_temp.assert_true(pg_temp.reserve(current_setting('guard.b')::uuid,current_setting('guard.boxb')::uuid)->>'reason'='recipient_frequency','failed followup preserves earlier accepted contact');
UPDATE public.marketing_recipient_pacing SET accepted_at=clock_timestamp()-interval '2 days',accepted_next_at=clock_timestamp()-interval '1 day' WHERE organization_id='41000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(pg_temp.reserve(current_setting('guard.b')::uuid,current_setting('guard.boxb')::uuid)->>'allowed'='true','another campaign proceeds after its wait expires');
SELECT public.finish_meta_outbound(current_setting('guard.boxb')::uuid,'accepted','wamid.guard-b');
UPDATE public.meta_outbound_outbox SET status='sending' WHERE id=current_setting('guard.followup')::uuid;
SELECT pg_temp.assert_true(pg_temp.reserve(current_setting('guard.a')::uuid,current_setting('guard.followup')::uuid)->>'reason'='recipient_frequency','incoming campaign wait also applies after a prior campaign with zero wait');
UPDATE public.meta_outbound_outbox SET status='failed' WHERE id=current_setting('guard.followup')::uuid;
UPDATE public.marketing_enrollments e SET current_step_id=s.id FROM public.marketing_steps s WHERE e.campaign_id=current_setting('guard.b')::uuid AND s.sequence_id=e.sequence_id AND s.order_index=1;
UPDATE public.marketing_number_pacing SET next_dispatch_at=clock_timestamp()-interval '1 second' WHERE number_key='guard-number-b';
SELECT set_config('guard.followupb',pg_temp.box(current_setting('guard.b')::uuid)::text,true);
SELECT pg_temp.assert_true(pg_temp.reserve(current_setting('guard.b')::uuid,current_setting('guard.followupb')::uuid)->>'allowed'='true','zero wait still permits an own followup');
SELECT public.finish_meta_outbound(current_setting('guard.followupb')::uuid,'unknown',NULL,'synthetic_unknown');
UPDATE public.meta_outbound_outbox SET status='sending' WHERE id=current_setting('guard.followup')::uuid;
SELECT pg_temp.assert_true(pg_temp.reserve(current_setting('guard.a')::uuid,current_setting('guard.followup')::uuid)->>'reason'='recipient_unconfirmed','unknown outcome does not allow another blind contact');
UPDATE public.meta_outbound_outbox SET status='failed' WHERE id=current_setting('guard.followup')::uuid;
-- Ignore old history, business app echoes and messages from another connected number.
UPDATE public.meta_outbound_outbox SET created_at=clock_timestamp()-interval '1 hour' WHERE id=current_setting('guard.boxa')::uuid;
INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,created_at,metadata)
 SELECT organization_id,conversation_id,'whatsapp','inbound','received','{}',claimed_at-interval '1 minute','{}' FROM public.meta_outbound_outbox WHERE id=current_setting('guard.boxa')::uuid;
INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,created_at,metadata)
 SELECT organization_id,conversation_id,'whatsapp','inbound','received','{}',clock_timestamp(),'{"historical":true}' FROM public.meta_outbound_outbox WHERE id=current_setting('guard.boxa')::uuid;
INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,created_at,metadata)
 SELECT organization_id,conversation_id,'whatsapp','inbound','received','{}',clock_timestamp(),'{"metadata":{"historical":true}}' FROM public.meta_outbound_outbox WHERE id=current_setting('guard.boxa')::uuid;
INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,created_at,metadata)
 SELECT organization_id,conversation_id,'whatsapp','outbound','sent','{}',clock_timestamp(),'{"is_echo":true}' FROM public.meta_outbound_outbox WHERE id=current_setting('guard.boxa')::uuid;
INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,created_at)
 SELECT organization_id,conversation_id,'whatsapp','inbound','received','{}',clock_timestamp() FROM public.meta_outbound_outbox WHERE id=current_setting('guard.boxb')::uuid;
SELECT pg_temp.assert_true(public.marketing_reply_at('41000000-0000-4000-8000-000000000001',(SELECT id FROM public.marketing_enrollments WHERE campaign_id=current_setting('guard.a')::uuid)) IS NULL,'no false reply from history, echo or other channel');
-- Prepare a pending followup then persist an audio response; nothing alters the accepted first send.
UPDATE public.meta_outbound_outbox SET status='queued',external_id=NULL,error_kind=NULL WHERE id=current_setting('guard.followup')::uuid;
INSERT INTO public.messages(organization_id,conversation_id,channel,direction,status,content,created_at)
 SELECT organization_id,conversation_id,'whatsapp','inbound','received','{"type":"audio"}',clock_timestamp() FROM public.meta_outbound_outbox WHERE id=current_setting('guard.boxa')::uuid;
SELECT pg_temp.assert_true(NOT public.marketing_outbound_allowed('41000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001',pg_temp.op(current_setting('guard.a')::uuid)),'response closes dispatch before queued recovery');
SELECT pg_temp.assert_true(NOT public.stop_marketing_followups_on_reply('41000000-0000-4000-8000-000000000002','42000000-0000-4000-8000-000000000001',pg_temp.op(current_setting('guard.a')::uuid)),'foreign tenant cannot cancel followups');
SELECT pg_temp.assert_true(public.stop_marketing_followups_on_reply('41000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001',pg_temp.op(current_setting('guard.a')::uuid)),'real audio response cancels pending followup');
SELECT pg_temp.assert_true((SELECT status='cancelled' AND claim_token IS NULL AND next_run_at IS NULL FROM public.marketing_enrollments WHERE campaign_id=current_setting('guard.a')::uuid),'enrollment records reply cancellation');
SELECT pg_temp.assert_true((SELECT status='failed' AND error_kind='campaign_replied' FROM public.meta_outbound_outbox WHERE id=current_setting('guard.followup')::uuid),'pending outbox records cancellation reason');
SELECT pg_temp.assert_true((SELECT status='accepted' AND external_id='wamid.guard-a' FROM public.meta_outbound_outbox WHERE id=current_setting('guard.boxa')::uuid),'accepted send is preserved');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.messages WHERE content->>'type'='audio' AND organization_id='41000000-0000-4000-8000-000000000001'),'inbound audio is untouched');
SELECT public.stop_marketing_followups_on_reply('41000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001',pg_temp.op(current_setting('guard.a')::uuid));
SELECT pg_temp.assert_true(NOT has_function_privilege('authenticated','public.stop_marketing_followups_on_reply(uuid,uuid,text)','EXECUTE'),'reply cancellation is service only');
SELECT pg_temp.assert_true(NOT has_function_privilege('service_role','public.reserve_marketing_dispatch_before_recipient(uuid,uuid,text,uuid)','EXECUTE'),'service cannot bypass frequency via old helper');
ROLLBACK;
