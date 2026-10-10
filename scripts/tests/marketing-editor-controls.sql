-- Local Docker only. All fixtures, including auth/profile records, roll back.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE caught boolean:=false; BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN IF position(fragment in SQLERRM)=0 THEN RAISE; END IF; caught:=true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Expected rejection: %',statement; END IF; END $$;
SELECT set_config('marketing.test_user',(SELECT id::text FROM auth.users LIMIT 1),true);
SELECT set_config('request.jwt.claims',json_build_object('role','service_role','sub',current_setting('marketing.test_user'))::text,true);
INSERT INTO public.organizations(id,name,slug) VALUES
 ('25000000-0000-4000-8000-000000000001','Editor fixture','marketing-editor-fixture'),
 ('25000000-0000-4000-8000-000000000002','Foreign editor fixture','foreign-marketing-editor-fixture');
INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES
 ('25000000-0000-4000-8000-000000000001',current_setting('marketing.test_user')::uuid,'owner','active');
INSERT INTO public.marketing_campaigns(id,organization_id,name,delivery_config) VALUES
 ('26000000-0000-4000-8000-000000000001','25000000-0000-4000-8000-000000000001','Editor draft','{"mode":"growth","humanize":false,"timezone":"America/Bogota"}'),
 ('26000000-0000-4000-8000-000000000002','25000000-0000-4000-8000-000000000002','Foreign draft','{"mode":"growth","humanize":false,"timezone":"America/Bogota"}');
INSERT INTO public.marketing_sequences(id,organization_id,campaign_id,name,trigger_type,is_active) VALUES
 ('27000000-0000-4000-8000-000000000001','25000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','Editor sequence','manual',true);
INSERT INTO public.marketing_steps(id,organization_id,sequence_id,name,type,content,delay_config)
 SELECT ('28000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'25000000-0000-4000-8000-000000000001',
 '27000000-0000-4000-8000-000000000001','Synthetic wait '||n,'delay','{}','{"value":1,"unit":"minutes"}' FROM generate_series(1,3) n;
SELECT set_config('marketing.original', (SELECT array_agg(id ORDER BY order_index,id)::text FROM public.marketing_steps WHERE sequence_id='27000000-0000-4000-8000-000000000001'),true);
SELECT set_config('marketing.target', (SELECT array_agg(id ORDER BY order_index DESC,id)::text FROM public.marketing_steps WHERE sequence_id='27000000-0000-4000-8000-000000000001'),true);
SELECT set_config('marketing.content', (SELECT jsonb_agg(to_jsonb(s)-'order_index' ORDER BY id)::text FROM public.marketing_steps s WHERE sequence_id='27000000-0000-4000-8000-000000000001'),true);
SELECT set_config('marketing.old_review',public.prepare_marketing_activation_review('25000000-0000-4000-8000-000000000001',current_setting('marketing.test_user')::uuid,'26000000-0000-4000-8000-000000000001')->>'token',true);
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$UPDATE public.marketing_steps SET order_index=99 WHERE id='28000000-0000-4000-8000-000000000001'$q$,'dedicated reorder');
SELECT set_config('pixy.marketing_reorder','true',true);
SELECT pg_temp.expect_error($q$UPDATE public.marketing_steps SET order_index=99 WHERE id='28000000-0000-4000-8000-000000000001'$q$,'dedicated reorder');
SELECT pg_temp.expect_error($q$INSERT INTO public.marketing_step_reorder_guards VALUES(txid_current(),'27000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000001',99)$q$,'permission denied');
SELECT pg_temp.assert_true(public.reorder_marketing_steps('25000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001',current_setting('marketing.original')::uuid[],current_setting('marketing.target')::uuid[]),'reorder succeeds');
SELECT pg_temp.assert_true((SELECT array_agg(id ORDER BY order_index,id)=current_setting('marketing.target')::uuid[] FROM public.marketing_steps WHERE sequence_id='27000000-0000-4000-8000-000000000001'),'target order saved');
SELECT pg_temp.assert_true((SELECT jsonb_agg(to_jsonb(s)-'order_index' ORDER BY id)=current_setting('marketing.content')::jsonb FROM public.marketing_steps s WHERE sequence_id='27000000-0000-4000-8000-000000000001'),'step IDs and content unchanged');
SELECT pg_temp.assert_true(public.reorder_marketing_steps('25000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001',current_setting('marketing.original')::uuid[],current_setting('marketing.target')::uuid[]),'same-target retry is idempotent');
SELECT pg_temp.expect_error($q$SELECT public.reorder_marketing_steps('25000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001',current_setting('marketing.original')::uuid[],ARRAY['28000000-0000-4000-8000-000000000002','28000000-0000-4000-8000-000000000003','28000000-0000-4000-8000-000000000001']::uuid[])$q$,'order changed');
SELECT pg_temp.expect_error($q$SELECT public.reorder_marketing_steps('25000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001',current_setting('marketing.target')::uuid[],ARRAY['28000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000003']::uuid[])$q$,'Invalid step order');
SELECT pg_temp.expect_error($q$SELECT public.reorder_marketing_steps('25000000-0000-4000-8000-000000000002','26000000-0000-4000-8000-000000000002','27000000-0000-4000-8000-000000000001',current_setting('marketing.target')::uuid[],current_setting('marketing.original')::uuid[])$q$,'access denied');
SELECT pg_temp.expect_error($q$SELECT public.reorder_marketing_steps('25000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000002','27000000-0000-4000-8000-000000000001',current_setting('marketing.target')::uuid[],current_setting('marketing.original')::uuid[])$q$,'unexecuted draft');
RESET ROLE;
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.marketing_step_reorder_guards),'no persistent capabilities');
SELECT pg_temp.expect_error($q$SELECT public.confirm_marketing_activation_review('25000000-0000-4000-8000-000000000001',current_setting('marketing.test_user')::uuid,'26000000-0000-4000-8000-000000000001',current_setting('marketing.old_review')::uuid)$q$,'Campaign changed');
SET LOCAL ROLE service_role;
SELECT pg_temp.expect_error($q$SELECT * FROM public.marketing_step_reorder_guards$q$,'permission denied');
RESET ROLE;
INSERT INTO public.integration_connections(id,organization_id,provider_key,connection_name,status,credentials) VALUES
 ('30000000-0000-4000-8000-000000000001','25000000-0000-4000-8000-000000000001','whatsapp_cloud','Synthetic editor number','active','{}');
UPDATE public.marketing_campaigns SET connection_id='30000000-0000-4000-8000-000000000001' WHERE id='26000000-0000-4000-8000-000000000001';
UPDATE public.organization_members SET role='member',permissions='{"marketing.campaigns.manage":true,"marketing.campaigns.view":true,"inbox_access":[]}'
 WHERE organization_id='25000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.reorder_marketing_steps('25000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001',current_setting('marketing.target')::uuid[],current_setting('marketing.original')::uuid[])$q$,'Channel access denied');
RESET ROLE;
UPDATE public.organization_members SET role='owner',permissions='{"marketing.campaigns.manage":false}' WHERE organization_id='25000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.reorder_marketing_steps('25000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001',current_setting('marketing.target')::uuid[],current_setting('marketing.original')::uuid[])$q$,'access denied');
RESET ROLE;
UPDATE public.organization_members SET permissions='{}' WHERE organization_id='25000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claims',json_build_object('role','service_role','sub',current_setting('marketing.test_user'))::text,true);
UPDATE public.marketing_campaigns SET status='paused' WHERE id='26000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.reorder_marketing_steps('25000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001',current_setting('marketing.target')::uuid[],current_setting('marketing.original')::uuid[])$q$,'unexecuted draft');
RESET ROLE;
SELECT set_config('request.jwt.claims',json_build_object('role','service_role','sub',current_setting('marketing.test_user'))::text,true);
UPDATE public.marketing_campaigns SET status='draft',execution_version=2 WHERE id='26000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('marketing.test_user'))::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.reorder_marketing_steps('25000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001',current_setting('marketing.target')::uuid[],current_setting('marketing.original')::uuid[])$q$,'unexecuted draft');
RESET ROLE;
-- Separate synthetic users exercise bounded paging and name-only tenant access.
INSERT INTO auth.users(id,email)
 SELECT ('29000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'synthetic-marketing-editor-'||n||'@example.invalid' FROM generate_series(1,24) n;
INSERT INTO public.profiles(id,full_name)
 SELECT ('29000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Synthetic assignee '||n FROM generate_series(1,24) n ON CONFLICT(id) DO UPDATE SET full_name=EXCLUDED.full_name;
INSERT INTO public.organization_members(organization_id,user_id,role,status)
 SELECT CASE WHEN n=24 THEN '25000000-0000-4000-8000-000000000002'::uuid ELSE '25000000-0000-4000-8000-000000000001'::uuid END,
 ('29000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'member',CASE WHEN n=23 THEN 'blocked' ELSE 'active' END FROM generate_series(1,24) n;
SET LOCAL ROLE authenticated;
SELECT set_config('marketing.assignees',public.read_marketing_assignees('25000000-0000-4000-8000-000000000001','Synthetic assignee')::text,true);
SELECT pg_temp.assert_true(jsonb_array_length(current_setting('marketing.assignees')::jsonb->'rows')=20,'bounded assignee page');
SELECT set_config('marketing.assignee_next',public.read_marketing_assignees('25000000-0000-4000-8000-000000000001','Synthetic assignee',(current_setting('marketing.assignees')::jsonb->>'next')::uuid)::text,true);
SELECT pg_temp.assert_true(jsonb_array_length(current_setting('marketing.assignee_next')::jsonb->'rows')=2,'next page excludes foreign and inactive users');
SELECT pg_temp.assert_true(public.read_marketing_assignees('25000000-0000-4000-8000-000000000001','',NULL,'29000000-0000-4000-8000-000000000024')->'selected'='null'::jsonb,'no foreign selected profile leakage');
SELECT pg_temp.assert_true(public.read_marketing_assignees('25000000-0000-4000-8000-000000000001','',NULL,'29000000-0000-4000-8000-000000000023')#>>'{selected,active}'='false','inactive stored assignee readable without reselecting');
SELECT pg_temp.expect_error($q$SELECT public.read_marketing_assignees('25000000-0000-4000-8000-000000000002')$q$,'access denied');
RESET ROLE;
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.marketing_enrollments WHERE organization_id='25000000-0000-4000-8000-000000000001'),'no enrollments created');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.meta_outbound_outbox WHERE organization_id='25000000-0000-4000-8000-000000000001'),'no messages queued');
ROLLBACK;
