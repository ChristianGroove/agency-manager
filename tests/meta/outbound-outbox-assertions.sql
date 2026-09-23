-- Execute inside a disposable transaction after meta_outbound_outbox migration.
DO $$
DECLARE c record; op_key text := 'outbox-test-' || gen_random_uuid()::text;
        queued record; repeated record; saved_status text; saved_external text;
BEGIN
    SELECT v.id AS conversation_id, v.organization_id, v.connection_id INTO c
    FROM public.conversations v JOIN public.integration_connections i ON i.id = v.connection_id
    WHERE i.status = 'active' AND i.provider_key = 'whatsapp_cloud'
      AND v.organization_id = i.organization_id LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'An active WhatsApp test conversation is required'; END IF;

    SELECT * INTO queued FROM public.enqueue_meta_outbound(c.organization_id, c.connection_id,
        c.conversation_id, NULL, op_key, 'test-recipient', '{"type":"text","text":"outbox test"}',
        'System', 'whatsapp');
    IF queued.delivery_status <> 'queued' OR queued.message_id IS NULL THEN
        RAISE EXCEPTION 'Outbound operation was not queued with a message';
    END IF;
    SELECT * INTO repeated FROM public.enqueue_meta_outbound(c.organization_id, c.connection_id,
        c.conversation_id, NULL, op_key, 'test-recipient', '{"type":"text","text":"outbox test"}',
        'System', 'whatsapp');
    IF repeated.outbox_id <> queued.outbox_id OR repeated.message_id <> queued.message_id THEN
        RAISE EXCEPTION 'Repeated operation created a duplicate';
    END IF;
    BEGIN
        PERFORM public.enqueue_meta_outbound(c.organization_id, c.connection_id,
            c.conversation_id, NULL, op_key, 'test-recipient', '{"type":"text","text":"different"}',
            'System', 'whatsapp');
        RAISE EXCEPTION 'Idempotency conflict was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'Outbound idempotency key reused for different content' THEN RAISE; END IF;
    END;

    UPDATE public.meta_outbound_outbox SET status='sending', claimed_at=now()
    WHERE id=queued.outbox_id AND status='queued';
    IF NOT public.finish_meta_outbound(queued.outbox_id, 'accepted', 'wamid.outbox-test', NULL) THEN
        RAISE EXCEPTION 'Accepted operation could not be finished';
    END IF;
    IF public.finish_meta_outbound(queued.outbox_id, 'accepted', 'wamid.duplicate', NULL) THEN
        RAISE EXCEPTION 'Operation was finished twice';
    END IF;
    SELECT status, external_id INTO saved_status, saved_external FROM public.messages WHERE id=queued.message_id;
    IF saved_status <> 'sent' OR saved_external <> 'wamid.outbox-test' THEN
        RAISE EXCEPTION 'Accepted result did not reconcile its message';
    END IF;
END $$;
SELECT 'Meta outbound outbox assertions passed' AS result;
