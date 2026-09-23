BEGIN;

-- Include the legacy multi-asset parents when checking ownership. The older
-- unique index only covers modern metadata.asset_id rows.
CREATE FUNCTION public.meta_connection_asset_keys(p_provider_key text, p_metadata jsonb)
RETURNS TABLE(asset_type text, asset_id text)
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
    WITH m AS (SELECT coalesce(p_metadata, '{}'::jsonb) AS value),
    keys AS (
        SELECT CASE p_provider_key
            WHEN 'whatsapp_cloud' THEN 'whatsapp'
            WHEN 'meta_whatsapp' THEN 'whatsapp'
            WHEN 'facebook_page' THEN 'page'
            WHEN 'instagram_dm' THEN 'instagram'
            WHEN 'instagram_dme' THEN 'instagram'
            WHEN 'meta_business' THEN CASE m.value->>'asset_type'
                WHEN 'whatsapp' THEN 'whatsapp' WHEN 'page' THEN 'page'
                WHEN 'instagram' THEN 'instagram' END
            END AS asset_type, nullif(m.value->>'asset_id', '') AS asset_id
        FROM m
        UNION
        SELECT CASE asset.value->>'type'
            WHEN 'whatsapp' THEN 'whatsapp' WHEN 'page' THEN 'page'
            WHEN 'instagram' THEN 'instagram' END,
            nullif(asset.value->>'id', '')
        FROM m CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(m.value->'selected_assets') = 'array'
                THEN m.value->'selected_assets' ELSE '[]'::jsonb END
        ) AS asset(value)
        WHERE p_provider_key IN ('meta_business', 'meta_whatsapp')
        UNION
        SELECT 'page', nullif(coalesce(m.value->>'page_id', m.value->>'pageId'), '')
        FROM m WHERE p_provider_key IN ('instagram_dm', 'instagram_dme')
        UNION
        SELECT 'waba', nullif(m.value->>'waba_id', '')
        FROM m WHERE p_provider_key IN ('whatsapp_cloud', 'meta_whatsapp')
        UNION
        SELECT 'waba', nullif(asset.value->>'waba_id', '')
        FROM m CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(m.value->'selected_assets') = 'array'
                THEN m.value->'selected_assets' ELSE '[]'::jsonb END
        ) AS asset(value)
        WHERE p_provider_key IN ('meta_business', 'meta_whatsapp')
          AND asset.value->>'type' = 'whatsapp'
    )
    SELECT DISTINCT keys.asset_type, keys.asset_id FROM keys
    WHERE keys.asset_type IS NOT NULL AND keys.asset_id IS NOT NULL;
$$;

-- A migration must stop on existing cross-tenant claims so ownership is
-- reconciled by a person, never assigned by row order.
DO $$
DECLARE conflict record;
BEGIN
    SELECT key.asset_type, key.asset_id INTO conflict
    FROM public.integration_connections connection
    CROSS JOIN LATERAL public.meta_connection_asset_keys(connection.provider_key, connection.metadata) key
    WHERE connection.status IS DISTINCT FROM 'deleted'
    GROUP BY key.asset_type, key.asset_id
    HAVING count(DISTINCT connection.organization_id) > 1
    LIMIT 1;
    IF FOUND THEN
        RAISE EXCEPTION 'Meta asset ownership conflict requires reconciliation'
            USING ERRCODE = '23505';
    END IF;
END $$;

CREATE FUNCTION public.guard_meta_connection_asset_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE key record;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM 'deleted' THEN RETURN NEW; END IF;
    FOR key IN
        SELECT asset_type, asset_id
        FROM public.meta_connection_asset_keys(NEW.provider_key, NEW.metadata)
        ORDER BY asset_type, asset_id
    LOOP
        -- Serializes concurrent claims for the same asset across organizations.
        PERFORM pg_advisory_xact_lock(hashtextextended(key.asset_type || ':' || key.asset_id, 0));
        IF EXISTS (
            SELECT 1 FROM public.integration_connections existing
            CROSS JOIN LATERAL public.meta_connection_asset_keys(existing.provider_key, existing.metadata) owned
            WHERE existing.id <> NEW.id
              AND existing.organization_id <> NEW.organization_id
              AND existing.status IS DISTINCT FROM 'deleted'
              AND owned.asset_type = key.asset_type AND owned.asset_id = key.asset_id
        ) THEN
            RAISE EXCEPTION 'Meta asset already belongs to another organization'
                USING ERRCODE = '23505';
        END IF;
    END LOOP;
    RETURN NEW;
END $$;

CREATE TRIGGER guard_meta_connection_asset_owner
BEFORE INSERT OR UPDATE OF organization_id, provider_key, status, metadata
ON public.integration_connections FOR EACH ROW
EXECUTE FUNCTION public.guard_meta_connection_asset_owner();

REVOKE ALL ON FUNCTION public.meta_connection_asset_keys(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_meta_connection_asset_owner() FROM PUBLIC, anon, authenticated;

COMMIT;
