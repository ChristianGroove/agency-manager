BEGIN;

CREATE TABLE public.meta_outbound_outbox (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    connection_id uuid NOT NULL,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
    message_id uuid UNIQUE REFERENCES public.messages(id) ON DELETE SET NULL,
    operation_key text NOT NULL,
    recipient text NOT NULL,
    content jsonb NOT NULL,
    sender text NOT NULL,
    channel text NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','accepted','unknown','failed')),
    external_id text,
    error_kind text,
    claimed_at timestamptz,
    available_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, operation_key)
);
CREATE INDEX meta_outbound_outbox_pending ON public.meta_outbound_outbox(status, available_at, created_at)
    WHERE status IN ('queued','sending');
ALTER TABLE public.meta_outbound_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meta_outbound_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.meta_outbound_outbox TO service_role;

-- One transaction records both the visible message and its delivery operation.
-- Only trusted server code may invoke this function after authenticating the actor.
CREATE FUNCTION public.enqueue_meta_outbound(
    p_organization_id uuid, p_connection_id uuid, p_conversation_id uuid,
    p_message_id uuid, p_operation_key text, p_recipient text,
    p_content jsonb, p_sender text, p_channel text
) RETURNS TABLE(outbox_id uuid, message_id uuid, delivery_status text, external_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE previous public.meta_outbound_outbox%ROWTYPE; new_message_id uuid; new_outbox_id uuid;
BEGIN
    IF p_operation_key IS NULL OR length(p_operation_key) < 1 OR length(p_operation_key) > 200
       OR nullif(p_recipient, '') IS NULL OR p_content IS NULL THEN
        RAISE EXCEPTION 'Invalid outbound operation';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_operation_key, 0));
    SELECT * INTO previous FROM public.meta_outbound_outbox
    WHERE organization_id = p_organization_id AND operation_key = p_operation_key;
    IF FOUND THEN
        IF previous.connection_id <> p_connection_id OR previous.conversation_id IS DISTINCT FROM p_conversation_id
           OR previous.recipient <> p_recipient OR previous.content <> p_content
           OR previous.sender <> p_sender OR previous.channel <> p_channel THEN
            RAISE EXCEPTION 'Outbound idempotency key reused for different content';
        END IF;
        RETURN QUERY SELECT previous.id, previous.message_id, previous.status, previous.external_id;
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.integration_connections
                   WHERE id = p_connection_id AND organization_id = p_organization_id AND status = 'active') THEN
        RAISE EXCEPTION 'Outbound channel is unavailable';
    END IF;
    IF p_conversation_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.conversations WHERE id = p_conversation_id
          AND organization_id = p_organization_id AND connection_id = p_connection_id
    ) THEN RAISE EXCEPTION 'Outbound conversation does not belong to channel'; END IF;

    IF p_conversation_id IS NOT NULL THEN
        new_message_id := coalesce(p_message_id, gen_random_uuid());
        INSERT INTO public.messages(id, organization_id, conversation_id, direction, channel, content,
                                    status, external_id, sender, metadata)
        VALUES (new_message_id, p_organization_id, p_conversation_id, 'outbound', p_channel, p_content,
                'sending', NULL, p_sender, jsonb_build_object('delivery_state','queued',
                    'sender_type', CASE WHEN p_sender = 'System' THEN 'bot' ELSE 'human' END));
    END IF;
    INSERT INTO public.meta_outbound_outbox(organization_id, connection_id, conversation_id,
        message_id, operation_key, recipient, content, sender, channel)
    VALUES (p_organization_id, p_connection_id, p_conversation_id, new_message_id,
        p_operation_key, p_recipient, p_content, p_sender, p_channel)
    RETURNING id INTO new_outbox_id;
    RETURN QUERY SELECT new_outbox_id, new_message_id, 'queued'::text, NULL::text;
END $$;

CREATE FUNCTION public.finish_meta_outbound(
    p_outbox_id uuid, p_status text, p_external_id text DEFAULT NULL, p_error_kind text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE operation public.meta_outbound_outbox%ROWTYPE;
BEGIN
    IF p_status NOT IN ('accepted','unknown','failed') THEN RAISE EXCEPTION 'Invalid outbound result'; END IF;
    UPDATE public.meta_outbound_outbox SET status = p_status, external_id = p_external_id,
        error_kind = p_error_kind, updated_at = now()
    WHERE id = p_outbox_id AND status = 'sending'
    RETURNING * INTO operation;
    IF NOT FOUND THEN RETURN false; END IF;
    IF operation.message_id IS NOT NULL THEN
        UPDATE public.messages SET
            external_id = coalesce(p_external_id, external_id),
            status = CASE WHEN p_status = 'accepted' AND status = 'sending' THEN 'sent'
                          WHEN p_status = 'failed' AND status = 'sending' THEN 'failed'
                          ELSE status END,
            metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('delivery_state', p_status)
        WHERE id = operation.message_id AND organization_id = operation.organization_id;
    END IF;
    RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.enqueue_meta_outbound(uuid,uuid,uuid,uuid,text,text,jsonb,text,text)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_meta_outbound(uuid,text,text,text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_meta_outbound(uuid,uuid,uuid,uuid,text,text,jsonb,text,text)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_meta_outbound(uuid,text,text,text)
    TO service_role;

COMMIT;
