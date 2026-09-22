BEGIN;
DO $$ BEGIN
 IF (SELECT credentials->>'_private' FROM public.integration_connections LIMIT 1) IS DISTINCT FROM '20000000-0000-0000-0000-000000000001' THEN RAISE EXCEPTION 'Public credential migration failed'; END IF;
 IF (SELECT credentials->>'access_token' FROM public.integration_connection_secrets LIMIT 1) IS DISTINCT FROM 'legacy-test-token' THEN RAISE EXCEPTION 'Legacy token was lost'; END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM credentials FROM public.integration_connection_secrets; RAISE EXCEPTION 'Secret SELECT was permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM payload FROM public.meta_webhook_events; RAISE EXCEPTION 'Raw webhook SELECT was permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM state_hash FROM public.meta_oauth_sessions; RAISE EXCEPTION 'OAuth SELECT was permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 BEGIN INSERT INTO public.integration_connections(organization_id,provider_key,status,metadata) VALUES ('10000000-0000-0000-0000-000000000002','whatsapp_cloud','active','{"asset_id":"phone1"}'); RAISE EXCEPTION 'Duplicate ownership allowed'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN INSERT INTO public.integration_connections(organization_id,provider_key,status,credentials) VALUES ('10000000-0000-0000-0000-000000000002','whatsapp_cloud','active','{"access_token":"plaintext"}'); RAISE EXCEPTION 'Plaintext allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Meta credentials must be encrypted by the server' THEN RAISE; END IF; END;
 BEGIN UPDATE public.integration_connections SET credentials='{"_private":"20000000-0000-0000-0000-000000000099"}'; RAISE EXCEPTION 'Foreign credential reference allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Invalid credential reference' THEN RAISE; END IF; END;
END $$;
INSERT INTO public.integration_connections(id,organization_id,provider_key,status,credentials,metadata) VALUES ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','instagram_dm','active','{"_encrypted":"test-ciphertext"}','{"asset_id":"instagram1"}');
SET CONSTRAINTS ALL IMMEDIATE;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.integration_connection_secrets WHERE connection_id='20000000-0000-0000-0000-000000000002' AND credentials->>'_encrypted'='test-ciphertext') THEN RAISE EXCEPTION 'Atomic secret insert failed'; END IF;
 BEGIN INSERT INTO public.integration_connections(organization_id,provider_key,status,metadata) VALUES ('10000000-0000-0000-0000-000000000001','instagram_dme','active','{"asset_id":"instagram1"}'); RAISE EXCEPTION 'IG alias duplicate allowed'; EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $$ BEGIN
 IF NOT public.claim_meta_history_request('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Initial history claim failed'; END IF;
 IF public.claim_meta_history_request('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'History request repeated'; END IF;
END $$;
INSERT INTO public.conversations VALUES ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002');
SELECT public.record_meta_message_status('20000000-0000-0000-0000-000000000001','{"id":"wamid.same","status":"read","timestamp":"1700000001","pricing":{"pricing_model":"PMP","billable":true}}');
INSERT INTO public.messages(conversation_id,external_id,status) VALUES ('30000000-0000-0000-0000-000000000001','wamid.same','sent'),('30000000-0000-0000-0000-000000000002','wamid.same','sent');
SELECT public.record_meta_message_status('20000000-0000-0000-0000-000000000001','{"id":"wamid.same","status":"sent","timestamp":"1700000000"}');
DO $$ BEGIN
 IF (SELECT status FROM public.messages WHERE conversation_id='30000000-0000-0000-0000-000000000001') <> 'read' THEN RAISE EXCEPTION 'Status regressed or early delivery race'; END IF;
 IF (SELECT status FROM public.messages WHERE conversation_id='30000000-0000-0000-0000-000000000002') <> 'sent' THEN RAISE EXCEPTION 'Cross-tenant status write'; END IF;
END $$;
UPDATE public.integration_connections SET status='deleted' WHERE id='20000000-0000-0000-0000-000000000002';
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.integration_connection_secrets WHERE connection_id='20000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Secret survived deletion'; END IF;
END $$;
ROLLBACK;
SELECT 'Meta security assertions passed' AS result;
