-- Run only inside a disposable transaction after meta_asset_ownership_guard.
DO $$
DECLARE first_org uuid; second_org uuid; released_id uuid;
BEGIN
    SELECT id INTO first_org FROM public.organizations ORDER BY id LIMIT 1;
    SELECT id INTO second_org FROM public.organizations ORDER BY id OFFSET 1 LIMIT 1;
    IF first_org IS NULL OR second_org IS NULL THEN RAISE EXCEPTION 'Two test organizations required'; END IF;

    INSERT INTO public.integration_connections(organization_id, provider_key, connection_name, status, credentials, metadata)
    VALUES (first_org, 'meta_business', 'ownership-test-parent', 'active', '{"_encrypted":"test"}',
        '{"selected_assets":[{"id":"ownership-test-phone","type":"whatsapp","waba_id":"ownership-test-waba"},{"id":"ownership-test-page","type":"page"}]}');

    BEGIN
        INSERT INTO public.integration_connections(organization_id, provider_key, connection_name, status, credentials, metadata)
        VALUES (second_org, 'whatsapp_cloud', 'ownership-test-conflict', 'active', '{"_encrypted":"test"}', '{"asset_id":"ownership-test-phone"}');
        RAISE EXCEPTION 'Legacy WhatsApp claim was bypassed';
    EXCEPTION WHEN unique_violation THEN NULL; END;

    BEGIN
        INSERT INTO public.integration_connections(organization_id, provider_key, connection_name, status, credentials, metadata)
        VALUES (second_org, 'whatsapp_cloud', 'ownership-test-waba-conflict', 'active', '{"_encrypted":"test"}',
            '{"asset_id":"ownership-test-other-phone","waba_id":"ownership-test-waba"}');
        RAISE EXCEPTION 'Legacy WABA claim was bypassed';
    EXCEPTION WHEN unique_violation THEN NULL; END;

    BEGIN
        INSERT INTO public.integration_connections(organization_id, provider_key, connection_name, status, credentials, metadata)
        VALUES (second_org, 'facebook_page', 'ownership-test-page-conflict', 'active', '{"_encrypted":"test"}', '{"asset_id":"ownership-test-page"}');
        RAISE EXCEPTION 'Legacy Page claim was bypassed';
    EXCEPTION WHEN unique_violation THEN NULL; END;

    -- A parent OAuth connection and its operational channel may coexist within one tenant.
    INSERT INTO public.integration_connections(organization_id, provider_key, connection_name, status, credentials, metadata)
    VALUES (first_org, 'whatsapp_cloud', 'ownership-test-child', 'active', '{"_encrypted":"test"}',
        '{"asset_id":"ownership-test-phone","waba_id":"ownership-test-waba"}');

    INSERT INTO public.integration_connections(organization_id, provider_key, connection_name, status, credentials, metadata)
    VALUES (first_org, 'facebook_page', 'ownership-test-release', 'active', '{"_encrypted":"test"}', '{"asset_id":"ownership-test-release"}')
    RETURNING id INTO released_id;
    UPDATE public.integration_connections SET status='deleted' WHERE id=released_id;
    INSERT INTO public.integration_connections(organization_id, provider_key, connection_name, status, credentials, metadata)
    VALUES (second_org, 'facebook_page', 'ownership-test-new-owner', 'active', '{"_encrypted":"test"}', '{"asset_id":"ownership-test-release"}');
END $$;
SELECT 'Meta asset ownership assertions passed' AS result;
