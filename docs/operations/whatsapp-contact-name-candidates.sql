-- Solo lectura. Verifica propietario, conversación, mensaje entrante y teléfono.
-- No reproduce webhooks ni actualiza leads.
BEGIN TRANSACTION READ ONLY;
WITH candidates AS (
    SELECT DISTINCT ON (l.id)
        l.id AS lead_id,
        l.organization_id,
        c.connection_id,
        l.name AS current_name,
        COALESCE(NULLIF(BTRIM(ct->'profile'->>'name'), ''),
                 NULLIF(BTRIM(ct->'profile'->>'username'), '')) AS proposed_name
    FROM public.leads l
    JOIN public.conversations c ON c.lead_id = l.id
        AND c.organization_id = l.organization_id AND c.channel = 'whatsapp'
    JOIN public.integration_connections ic ON ic.id = c.connection_id
        AND ic.organization_id = l.organization_id AND ic.provider_key = 'whatsapp_cloud'
    JOIN public.meta_webhook_events w ON w.channel = 'whatsapp'
        AND w.created_at >= NOW() - INTERVAL '30 days'
    CROSS JOIN LATERAL jsonb_array_elements(w.payload->'entry') e
    CROSS JOIN LATERAL jsonb_array_elements(e->'changes') ch
    CROSS JOIN LATERAL jsonb_array_elements(ch->'value'->'contacts') ct
    WHERE l.name = 'WhatsApp User'
        AND ch->>'field' = 'messages'
        AND ch->'value'->'metadata'->>'phone_number_id' = ic.metadata->>'asset_id'
        AND ct->>'wa_id' = l.phone
        AND COALESCE(NULLIF(BTRIM(ct->'profile'->>'name'), ''),
                     NULLIF(BTRIM(ct->'profile'->>'username'), '')) IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(ch->'value'->'messages') incoming
            JOIN public.messages m ON m.external_id = incoming->>'id'
                AND m.conversation_id = c.id AND m.organization_id = l.organization_id
                AND m.direction = 'inbound'
            WHERE incoming->>'from' = ct->>'wa_id'
        )
    ORDER BY l.id, (NULLIF(BTRIM(ct->'profile'->>'name'), '') IS NOT NULL) DESC, w.created_at DESC
)
SELECT organization_id, connection_id, COUNT(*) AS recoverable_names
FROM candidates
GROUP BY organization_id, connection_id;
COMMIT;
