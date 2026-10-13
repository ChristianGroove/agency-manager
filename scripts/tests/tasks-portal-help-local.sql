-- Local Supabase only. All fixtures, reservations and counters roll back.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO organizations(id,name,slug,status) VALUES
 ('81111111-1111-4111-8111-111111111112','Portal test A','portal-help-test-a','active'),
 ('82222222-2222-4222-8222-222222222223','Portal test B','portal-help-test-b','active');
INSERT INTO organization_staff(id,organization_id,first_name,last_name,is_active) VALUES
 ('83333333-3333-4333-8333-333333333334','81111111-1111-4111-8111-111111111112','Fixture','A',true),
 ('84444444-4444-4444-8444-444444444445','81111111-1111-4111-8111-111111111112','Fixture','B',true),
 ('85555555-5555-4555-8555-555555555556','82222222-2222-4222-8222-222222222223','Fixture','C',true);
DO $$
DECLARE org uuid:='81111111-1111-4111-8111-111111111112'; staff uuid:='83333333-3333-4333-8333-333333333334';
 other uuid:='84444444-4444-4444-8444-444444444445'; req uuid:=gen_random_uuid(); th uuid; res jsonb; count_before int;
BEGIN
 IF has_table_privilege('anon','help_portal_threads','SELECT') OR has_table_privilege('authenticated','help_portal_messages','SELECT') THEN RAISE EXCEPTION 'Browser history privileges'; END IF;
 IF has_function_privilege('anon','begin_portal_help_turn(uuid,uuid,uuid,text,uuid)','EXECUTE') OR has_function_privilege('authenticated','finish_portal_help_turn(uuid,uuid,uuid,text,text[])','EXECUTE') THEN RAISE EXCEPTION 'Browser RPC privileges'; END IF;
 IF NOT has_function_privilege('service_role','begin_portal_help_turn(uuid,uuid,uuid,text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Server cannot reserve'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relname LIKE 'help_portal_%' AND relkind='r' AND NOT relrowsecurity) THEN RAISE EXCEPTION 'Missing RLS'; END IF;
 res:=begin_portal_help_turn(org,staff,req,'Pregunta inicial');
 IF res->>'status'<>'reserved' THEN RAISE EXCEPTION 'Initial reservation %',res; END IF;
 th:=(res->>'thread_id')::uuid;
 IF begin_portal_help_turn(org,staff,gen_random_uuid(),'Consulta concurrente',th)->>'status'<>'busy' THEN RAISE EXCEPTION 'Concurrency guard'; END IF;
 IF finish_portal_help_turn(org,other,req,'Impostor') THEN RAISE EXCEPTION 'Another staff finished request'; END IF;
 IF finish_portal_help_turn(org,staff,req,'Bad guide',ARRAY['dashboard.secret']) THEN RAISE EXCEPTION 'Out-of-scope article'; END IF;
 IF NOT finish_portal_help_turn(org,staff,req,'Respuesta inicial',ARRAY['tasks-portal.access-and-pin']) THEN RAISE EXCEPTION 'Answer persistence'; END IF;
 count_before:=(SELECT day_count FROM help_portal_tenant_limits WHERE organization_id=org);
 res:=begin_portal_help_turn(org,staff,req,'Pregunta inicial',th);
 IF res->>'status'<>'duplicate' OR res->>'message'<>'Respuesta inicial' THEN RAISE EXCEPTION 'Idempotency %',res; END IF;
 IF (SELECT day_count FROM help_portal_tenant_limits WHERE organization_id=org)<>count_before THEN RAISE EXCEPTION 'Duplicate quota charge'; END IF;
 IF begin_portal_help_turn(org,staff,req,'Pregunta distinta',th)->>'status'<>'invalid' THEN RAISE EXCEPTION 'Idempotency tampering'; END IF;
 IF begin_portal_help_turn(org,other,gen_random_uuid(),'Otra persona',th)->>'status'<>'invalid_thread' THEN RAISE EXCEPTION 'Cross-staff history'; END IF;
 IF begin_portal_help_turn('82222222-2222-4222-8222-222222222223','85555555-5555-4555-8555-555555555556',gen_random_uuid(),'Otro tenant',th)->>'status'<>'invalid_thread' THEN RAISE EXCEPTION 'Cross-tenant history'; END IF;
 req:=gen_random_uuid(); res:=begin_portal_help_turn(org,staff,req,'Proveedor falla',th);
 IF NOT finish_portal_help_turn(org,staff,req,NULL) THEN RAISE EXCEPTION 'Failed request release'; END IF;
 IF (SELECT active_request FROM help_portal_staff_limits WHERE organization_id=org AND staff_id=staff) IS NOT NULL THEN RAISE EXCEPTION 'Lease still active'; END IF;
 UPDATE help_portal_staff_limits SET minute_count=10 WHERE organization_id=org AND staff_id=staff;
 IF begin_portal_help_turn(org,staff,gen_random_uuid(),'Limite individual',th)->>'status'<>'rate_limited' THEN RAISE EXCEPTION 'Staff quota'; END IF;
 UPDATE help_portal_staff_limits SET minute_count=0 WHERE organization_id=org AND staff_id=staff;
 UPDATE help_portal_tenant_limits SET day_count=300 WHERE organization_id=org;
 IF begin_portal_help_turn(org,staff,gen_random_uuid(),'Limite diario',th)->>'status'<>'rate_limited' THEN RAISE EXCEPTION 'Tenant quota'; END IF;
 UPDATE help_portal_tenant_limits SET day_count=0,minute_count=30 WHERE organization_id=org;
 IF begin_portal_help_turn(org,staff,gen_random_uuid(),'Limite minuto',th)->>'status'<>'rate_limited' THEN RAISE EXCEPTION 'Tenant minute quota'; END IF;
 UPDATE help_portal_tenant_limits SET minute_count=0 WHERE organization_id=org;
 INSERT INTO help_portal_messages(thread_id,role,content) SELECT th,'user','Bounded '||n FROM generate_series(1,197) n;
 IF begin_portal_help_turn(org,staff,gen_random_uuid(),'Desborde',th)->>'status'<>'full' THEN RAISE EXCEPTION 'History cap'; END IF;
 UPDATE help_portal_threads SET last_activity=now()-interval '31 days' WHERE id=th;
 IF begin_portal_help_turn(org,staff,req,'Proveedor falla',th)->>'status'<>'invalid_thread' THEN RAISE EXCEPTION 'Expired duplicate retained access'; END IF;
 IF begin_portal_help_turn(org,staff,gen_random_uuid(),'Expirada',th)->>'status'<>'invalid_thread' THEN RAISE EXCEPTION 'History expiry'; END IF;
 req:=gen_random_uuid(); res:=begin_portal_help_turn(org,staff,req,'Nueva conversación');
 IF res->>'status'<>'reserved' OR EXISTS(SELECT 1 FROM help_portal_threads WHERE id=th) THEN RAISE EXCEPTION 'Expired thread pruning'; END IF;
 UPDATE help_portal_staff_limits SET lease_until=now()-interval '1 second' WHERE organization_id=org AND staff_id=staff;
 IF finish_portal_help_turn(org,staff,req,'Late answer') THEN RAISE EXCEPTION 'Expired lease accepted'; END IF;
 res:=begin_portal_help_turn(org,staff,gen_random_uuid(),'Tras expirar');
 IF res->>'status'<>'reserved' THEN RAISE EXCEPTION 'Lease recovery'; END IF;
 UPDATE organization_staff SET is_active=false WHERE id=staff;
 IF begin_portal_help_turn(org,staff,gen_random_uuid(),'Revocado')->>'status'<>'denied' THEN RAISE EXCEPTION 'Inactive staff'; END IF;
END $$;
ROLLBACK;
SELECT 'Portal isolation, privileges, idempotency, quotas, history caps, expiry and lease recovery: PASS; fixtures rolled back' AS result;
