BEGIN;
UPDATE public.integration_connections SET metadata=metadata||'{"waba_id":"123456789","connection_mode":"coexistence"}'::jsonb
WHERE id='20000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $$ DECLARE attempt jsonb;
BEGIN
 attempt:=public.begin_meta_coexistence_onboarding(
  '20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
 IF attempt->>'id' IS NULL THEN RAISE EXCEPTION 'No onboarding generation'; END IF;
 IF NOT public.claim_meta_coexistence_sync(
  '20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','contacts')
 THEN RAISE EXCEPTION 'Contacts claim failed'; END IF;
 IF public.claim_meta_coexistence_sync(
  '20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','contacts')
 THEN RAISE EXCEPTION 'Contacts request repeated'; END IF;
 IF NOT public.claim_meta_coexistence_sync(
  '20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','history')
 THEN RAISE EXCEPTION 'History claim failed'; END IF;
END $$;
UPDATE public.integration_connections SET status='connecting'
WHERE id='20000000-0000-0000-0000-000000000001';
SELECT public.apply_meta_account_update('123456789','ACCOUNT_OFFBOARDED','2026-09-22T10:00:00Z');
DO $$ BEGIN
 IF (SELECT status FROM public.integration_connections WHERE id='20000000-0000-0000-0000-000000000001') <> 'temporarily_offboarded'
 THEN RAISE EXCEPTION 'Offboard did not block sends'; END IF;
END $$;
SELECT public.record_meta_message_status('20000000-0000-0000-0000-000000000001',
 '{"id":"wamid.before_offboard","status":"delivered","timestamp":"1790000000"}');
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.meta_message_statuses
  WHERE connection_id='20000000-0000-0000-0000-000000000001'
   AND external_id='wamid.before_offboard' AND status='delivered')
 THEN RAISE EXCEPTION 'Receipt lost during temporary offboarding'; END IF;
END $$;
SELECT public.apply_meta_account_update('123456789','ACCOUNT_RECONNECTED','2026-09-22T10:01:00Z');
DO $$ BEGIN
 IF (SELECT status FROM public.integration_connections WHERE id='20000000-0000-0000-0000-000000000001') <> 'active'
 THEN RAISE EXCEPTION 'Reconnection failed'; END IF;
END $$;
SELECT public.apply_meta_account_update('123456789','ACCOUNT_OFFBOARDED','2026-09-22T10:00:00Z');
DO $$ BEGIN
 IF (SELECT status FROM public.integration_connections WHERE id='20000000-0000-0000-0000-000000000001') <> 'active'
 THEN RAISE EXCEPTION 'Late event regressed reconnection'; END IF;
END $$;
SELECT public.apply_meta_account_update('123456789','PARTNER_REMOVED','2026-09-22T10:02:00Z','ACCOUNT_DISCONNECTED','CLIENT');
SELECT public.apply_meta_account_update('123456789','ACCOUNT_RECONNECTED','2026-09-22T10:03:00Z');
DO $$ BEGIN
 IF (SELECT status FROM public.integration_connections WHERE id='20000000-0000-0000-0000-000000000001') <> 'action_required'
 THEN RAISE EXCEPTION 'Reconnect resurrected a removed partner'; END IF;
 IF (SELECT metadata->>'coexistence_disconnection_reason' FROM public.integration_connections
  WHERE id='20000000-0000-0000-0000-000000000001') <> 'ACCOUNT_DISCONNECTED'
 THEN RAISE EXCEPTION 'Disconnection reason lost'; END IF;
END $$;
DO $$ DECLARE before_id text; after_id text;
BEGIN
 SELECT metadata->>'coexistence_onboarding_id' INTO before_id FROM public.integration_connections
 WHERE id='20000000-0000-0000-0000-000000000001';
 PERFORM public.begin_meta_coexistence_onboarding(
  '20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
 SELECT metadata->>'coexistence_onboarding_id' INTO after_id FROM public.integration_connections
 WHERE id='20000000-0000-0000-0000-000000000001';
 IF after_id=before_id THEN RAISE EXCEPTION 'Fresh signup reused an old generation'; END IF;
END $$;
UPDATE public.integration_connections SET status='active',
 metadata=metadata||jsonb_build_object('coexistence_sync_deadline_at',now()-interval '1 minute')
WHERE id='20000000-0000-0000-0000-000000000001';
DO $$ BEGIN
 IF public.apply_meta_account_update('123456789','PARTNER_REMOVED','2026-09-22T10:02:00Z') <> 0
 THEN RAISE EXCEPTION 'Old partner removal affected the new generation'; END IF;
END $$;
DO $$ BEGIN
 IF public.expire_meta_coexistence_onboarding() <> 1 THEN RAISE EXCEPTION 'Overdue sync was not expired'; END IF;
END $$;
DO $$ BEGIN
 IF (SELECT status FROM public.integration_connections WHERE id='20000000-0000-0000-0000-000000000001') <> 'action_required'
 THEN RAISE EXCEPTION 'Expired initial sync remained active'; END IF;
END $$;
ROLLBACK;
SELECT 'Meta coexistence assertions passed' AS result;
