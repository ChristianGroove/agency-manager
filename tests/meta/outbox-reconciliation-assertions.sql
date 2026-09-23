-- Run in a transaction against local Supabase and ROLLBACK afterward.
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $$ BEGIN
    IF has_function_privilege('authenticated',
        'public.reconcile_meta_outbound(uuid,uuid,uuid,text,text,text)','EXECUTE') THEN
        RAISE EXCEPTION 'Authenticated users can bypass the application role check';
    END IF;
    IF has_table_privilege('authenticated','public.meta_outbound_reconciliations','SELECT') THEN
        RAISE EXCEPTION 'Reconciliation evidence is readable outside the service';
    END IF;
END $$;
DO $$
DECLARE c record; first_op record; second_op record; external text := 'wamid.reconcile.'||gen_random_uuid()::text;
        other_org uuid; saved_status text; audit_count integer;
BEGIN
    SELECT v.id AS conversation_id,v.organization_id,v.connection_id,m.user_id AS actor_id INTO c
    FROM public.conversations v
    JOIN public.integration_connections i ON i.id=v.connection_id AND i.organization_id=v.organization_id
    JOIN public.organization_members m ON m.organization_id=v.organization_id
    WHERE i.status='active' AND i.provider_key='whatsapp_cloud' LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active tenant conversation/member required'; END IF;
    SELECT id INTO other_org FROM public.organizations WHERE id<>c.organization_id LIMIT 1;
    IF other_org IS NULL THEN RAISE EXCEPTION 'Second tenant required'; END IF;
    SELECT * INTO first_op FROM public.enqueue_meta_outbound(c.organization_id,c.connection_id,
        c.conversation_id,NULL,'reconcile-'||gen_random_uuid()::text,'test-recipient',
        '{"type":"text","text":"test"}','System','whatsapp');
    UPDATE public.meta_outbound_outbox SET status='sending' WHERE id=first_op.outbox_id;
    PERFORM public.finish_meta_outbound(first_op.outbox_id,'unknown',NULL,'test_ambiguity');
    BEGIN
        PERFORM public.reconcile_meta_outbound(first_op.outbox_id,c.organization_id,c.actor_id,
            'accepted',external,'Verified receipt in Meta for this exact connection');
        RAISE EXCEPTION 'Accepted without receipt';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'Matching Meta receipt required' THEN RAISE; END IF;
    END;
    INSERT INTO public.meta_message_statuses(connection_id,organization_id,external_id,status,event_timestamp)
    VALUES(c.connection_id,c.organization_id,external,'delivered',now());
    IF public.reconcile_meta_outbound(first_op.outbox_id,other_org,c.actor_id,'accepted',external,
        'Verified receipt in Meta for this exact connection') THEN
        RAISE EXCEPTION 'Cross tenant reconciliation succeeded';
    END IF;
    IF NOT public.reconcile_meta_outbound(first_op.outbox_id,c.organization_id,c.actor_id,'accepted',external,
        'Verified receipt in Meta for this exact connection') THEN RAISE EXCEPTION 'Valid receipt rejected'; END IF;
    IF public.reconcile_meta_outbound(first_op.outbox_id,c.organization_id,c.actor_id,'accepted',external,
        'Verified receipt in Meta for this exact connection') THEN RAISE EXCEPTION 'Resolved twice'; END IF;
    SELECT status INTO saved_status FROM public.messages WHERE id=first_op.message_id;
    IF saved_status<>'delivered' THEN RAISE EXCEPTION 'Receipt status lost'; END IF;
    SELECT count(*) INTO audit_count FROM public.meta_outbound_reconciliations WHERE outbox_id=first_op.outbox_id;
    IF audit_count<>1 THEN RAISE EXCEPTION 'Audit row missing or duplicated'; END IF;

    SELECT * INTO second_op FROM public.enqueue_meta_outbound(c.organization_id,c.connection_id,
        c.conversation_id,NULL,'reconcile-'||gen_random_uuid()::text,'test-recipient',
        '{"type":"text","text":"test failure"}','System','whatsapp');
    UPDATE public.meta_outbound_outbox SET status='sending' WHERE id=second_op.outbox_id;
    PERFORM public.finish_meta_outbound(second_op.outbox_id,'unknown',NULL,'test_ambiguity');
    BEGIN
        PERFORM public.reconcile_meta_outbound(second_op.outbox_id,c.organization_id,c.actor_id,
            'failed',NULL,'short');
        RAISE EXCEPTION 'Short evidence accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'Invalid reconciliation' THEN RAISE; END IF;
    END;
    IF NOT public.reconcile_meta_outbound(second_op.outbox_id,c.organization_id,c.actor_id,
        'failed',NULL,'Verified Meta did not receive this message using the delivery log') THEN
        RAISE EXCEPTION 'Confirmed failure rejected'; END IF;
    SELECT status INTO saved_status FROM public.messages WHERE id=second_op.message_id;
    IF saved_status<>'failed' THEN RAISE EXCEPTION 'Failure not reflected in message'; END IF;
END $$;
SELECT 'Meta outbox reconciliation assertions passed' AS result;
