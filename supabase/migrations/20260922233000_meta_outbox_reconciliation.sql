BEGIN;

CREATE TABLE public.meta_outbound_reconciliations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    outbox_id uuid NOT NULL UNIQUE REFERENCES public.meta_outbound_outbox(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id uuid NOT NULL,
    outcome text NOT NULL CHECK (outcome IN ('accepted','failed')),
    external_id text,
    evidence text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meta_outbound_reconciliations_org ON public.meta_outbound_reconciliations(organization_id, created_at DESC);
ALTER TABLE public.meta_outbound_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meta_outbound_reconciliations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.meta_outbound_reconciliations TO service_role;

CREATE FUNCTION public.reconcile_meta_outbound(
    p_outbox_id uuid, p_organization_id uuid, p_actor_id uuid,
    p_outcome text, p_external_id text, p_evidence text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE operation public.meta_outbound_outbox%ROWTYPE; receipt_status text;
BEGIN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
    IF p_outcome NOT IN ('accepted','failed') OR length(trim(coalesce(p_evidence,''))) < 30
       OR length(p_evidence) > 2000 THEN RAISE EXCEPTION 'Invalid reconciliation'; END IF;
    SELECT * INTO operation FROM public.meta_outbound_outbox
    WHERE id=p_outbox_id AND organization_id=p_organization_id AND status='unknown' FOR UPDATE;
    IF NOT FOUND THEN RETURN false; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.organization_members
                   WHERE organization_id=p_organization_id AND user_id=p_actor_id) THEN
        RAISE EXCEPTION 'Actor is not a tenant member';
    END IF;
    IF p_outcome='accepted' THEN
        IF nullif(trim(coalesce(p_external_id,'')),'') IS NULL THEN
            RAISE EXCEPTION 'Meta message ID required';
        END IF;
        PERFORM pg_advisory_xact_lock(hashtextextended(operation.connection_id::text||':'||p_external_id,0));
        SELECT status INTO receipt_status FROM public.meta_message_statuses
        WHERE connection_id=operation.connection_id AND organization_id=p_organization_id
          AND external_id=p_external_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Matching Meta receipt required'; END IF;
        IF EXISTS (SELECT 1 FROM public.meta_outbound_outbox
                   WHERE connection_id=operation.connection_id AND external_id=p_external_id
                     AND id<>p_outbox_id) THEN RAISE EXCEPTION 'Meta message ID already assigned'; END IF;
        IF EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id=m.conversation_id
                   WHERE c.connection_id=operation.connection_id AND c.organization_id=p_organization_id
                     AND m.external_id=p_external_id AND m.id IS DISTINCT FROM operation.message_id) THEN
            RAISE EXCEPTION 'Meta message ID belongs to another message';
        END IF;
    ELSIF nullif(trim(coalesce(p_external_id,'')),'') IS NOT NULL THEN
        RAISE EXCEPTION 'Failed reconciliation cannot carry Meta message ID';
    END IF;
    INSERT INTO public.meta_outbound_reconciliations
        (outbox_id,organization_id,actor_id,outcome,external_id,evidence)
    VALUES (p_outbox_id,p_organization_id,p_actor_id,p_outcome,p_external_id,trim(p_evidence));
    UPDATE public.meta_outbound_outbox SET status=p_outcome, external_id=p_external_id,
        error_kind=CASE WHEN p_outcome='failed' THEN 'manual_confirmed_failure' ELSE NULL END,
        updated_at=now() WHERE id=p_outbox_id;
    IF operation.message_id IS NOT NULL THEN
        UPDATE public.messages SET external_id=coalesce(p_external_id,external_id),
            status=CASE WHEN p_outcome='failed' THEN 'failed'
                        ELSE coalesce(receipt_status,'sent') END,
            metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('delivery_state',p_outcome)
        WHERE id=operation.message_id AND organization_id=p_organization_id;
    END IF;
    RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_meta_outbound(uuid,uuid,uuid,text,text,text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_meta_outbound(uuid,uuid,uuid,text,text,text)
    TO service_role;

COMMIT;
