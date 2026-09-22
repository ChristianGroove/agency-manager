BEGIN;

-- Account updates are WABA-scoped. A temporarily offboarded companion can still
-- have a valid Graph token, so messaging availability must be tracked separately.
CREATE FUNCTION public.apply_meta_account_update(
 p_waba_id text, p_event text, p_event_at timestamptz,
 p_reason text DEFAULT NULL, p_initiated_by text DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE affected integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF p_waba_id !~ '^[0-9]+$' OR p_event NOT IN ('ACCOUNT_OFFBOARDED','ACCOUNT_RECONNECTED','PARTNER_REMOVED') THEN
  RAISE EXCEPTION 'Invalid account update';
 END IF;
 IF p_event = 'PARTNER_REMOVED' THEN
  UPDATE public.integration_connections SET status='action_required',
   metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
    'coexistence_state','partner_removed','coexistence_event_at',p_event_at,
    'coexistence_event',p_event,'coexistence_disconnection_reason',p_reason,
    'coexistence_disconnection_initiated_by',p_initiated_by)
  WHERE provider_key='whatsapp_cloud' AND metadata->>'waba_id'=p_waba_id
   AND status <> 'deleted'
   AND (metadata->>'coexistence_event_at' IS NULL OR
        (metadata->>'coexistence_event_at')::timestamptz < p_event_at);
 ELSE
  UPDATE public.integration_connections SET
   status=CASE WHEN p_event='ACCOUNT_OFFBOARDED' THEN 'temporarily_offboarded' ELSE 'active' END,
   metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
    'coexistence_state',CASE WHEN p_event='ACCOUNT_OFFBOARDED' THEN 'temporarily_offboarded' ELSE 'connected' END,
    'coexistence_event_at',p_event_at,'coexistence_event',p_event)
  WHERE provider_key='whatsapp_cloud' AND metadata->>'waba_id'=p_waba_id
   AND metadata->>'connection_mode'='coexistence'
   AND (p_event='ACCOUNT_OFFBOARDED' AND status IN ('connecting','active','connected','temporarily_offboarded')
     OR p_event='ACCOUNT_RECONNECTED' AND status='temporarily_offboarded')
   AND (metadata->>'coexistence_state' IS DISTINCT FROM 'partner_removed')
   AND (metadata->>'coexistence_event_at' IS NULL OR
        (metadata->>'coexistence_event_at')::timestamptz <= p_event_at);
 END IF;
 GET DIAGNOSTICS affected = ROW_COUNT;
 RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.apply_meta_account_update(text,text,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_meta_account_update(text,text,timestamptz,text,text) TO service_role;

-- A new generation is allowed only after Meta confirms the prior partner was
-- removed. Reopening Embedded Signup while still connected must not replay the
-- once-per-onboarding SMB data requests.
CREATE FUNCTION public.begin_meta_coexistence_onboarding(p_connection_id uuid,p_organization_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE current_metadata jsonb; attempt_id uuid; started_at timestamptz;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT EXISTS (
  SELECT 1 FROM public.organization_members WHERE user_id=auth.uid()
   AND organization_id=p_organization_id AND role IN ('owner','admin')
 ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT coalesce(metadata,'{}'::jsonb) INTO current_metadata
 FROM public.integration_connections WHERE id=p_connection_id AND organization_id=p_organization_id
  AND provider_key='whatsapp_cloud' AND metadata->>'connection_mode'='coexistence'
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Coexistence channel not found'; END IF;
 IF current_metadata->>'coexistence_onboarding_id' IS NOT NULL
    AND current_metadata->>'coexistence_state' IS DISTINCT FROM 'partner_removed' THEN
  RETURN jsonb_build_object('id',current_metadata->>'coexistence_onboarding_id',
   'deadline_at',current_metadata->>'coexistence_sync_deadline_at');
 END IF;
 attempt_id:=gen_random_uuid(); started_at:=now();
 IF current_metadata->>'coexistence_state' = 'partner_removed' THEN
  current_metadata:=current_metadata - ARRAY[
   'contacts_sync_claimed_at','history_sync_claimed_at','history_sync_requested_at',
   'contacts_sync_request_id','history_sync_request_id','history_sync_request_status',
   'history_sync_status','history_progress',
   'coexistence_disconnection_reason','coexistence_disconnection_initiated_by'];
 END IF;
 UPDATE public.integration_connections SET metadata=current_metadata||jsonb_build_object(
  'coexistence_onboarding_id',attempt_id,'coexistence_sync_started_at',started_at,
  'coexistence_sync_deadline_at',started_at+interval '24 hours',
  'coexistence_state','connected','onboarding_status','sync_pending')
 WHERE id=p_connection_id AND organization_id=p_organization_id;
 RETURN jsonb_build_object('id',attempt_id,'deadline_at',started_at+interval '24 hours');
END $$;
REVOKE ALL ON FUNCTION public.begin_meta_coexistence_onboarding(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.begin_meta_coexistence_onboarding(uuid,uuid) TO authenticated,service_role;

CREATE FUNCTION public.claim_meta_coexistence_sync(p_connection_id uuid,p_organization_id uuid,p_kind text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE claim_key text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT EXISTS (
  SELECT 1 FROM public.organization_members WHERE user_id=auth.uid()
   AND organization_id=p_organization_id AND role IN ('owner','admin')
 ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF p_kind NOT IN ('contacts','history') THEN RAISE EXCEPTION 'Invalid sync kind'; END IF;
 claim_key:=p_kind||'_sync_claimed_at';
 UPDATE public.integration_connections SET metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(claim_key,now())
 WHERE id=p_connection_id AND organization_id=p_organization_id
  AND provider_key='whatsapp_cloud' AND metadata->>'connection_mode'='coexistence'
  AND status IN ('active','connected')
  AND (metadata->>'coexistence_sync_deadline_at')::timestamptz > now()
  AND NOT (coalesce(metadata,'{}'::jsonb) ? claim_key)
  AND NOT (coalesce(metadata,'{}'::jsonb) ? 'history_sync_requested_at');
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_meta_coexistence_sync(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_meta_coexistence_sync(uuid,uuid,text) TO authenticated,service_role;

-- Cron marks an overdue initial sync as requiring offboard/re-onboarding. It
-- does not call /deregister, which Meta forbids for coexistence.
CREATE FUNCTION public.expire_meta_coexistence_onboarding()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE affected integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
 UPDATE public.integration_connections SET status='action_required',
  metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
   'onboarding_status','offboard_required','history_sync_request_status','expired')
 WHERE provider_key='whatsapp_cloud' AND metadata->>'connection_mode'='coexistence'
  AND status IN ('active','connected')
  AND (metadata->>'coexistence_sync_deadline_at')::timestamptz <= now()
  AND (metadata->>'contacts_sync_request_id' IS NULL OR metadata->>'history_sync_request_id' IS NULL);
 GET DIAGNOSTICS affected = ROW_COUNT;
 RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.expire_meta_coexistence_onboarding() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_meta_coexistence_onboarding() TO service_role;

COMMIT;
