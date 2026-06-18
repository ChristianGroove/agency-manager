-- Fix process_trial_expirations to respect saas_subscriptions.bypass_until
CREATE OR REPLACE FUNCTION "public"."process_trial_expirations"() RETURNS TABLE("org_id" "uuid", "org_name" "text", "action_taken" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    r RECORD;
BEGIN
    -- Suspend expired trials
    FOR r IN
        SELECT o.id, o.name
        FROM public.organizations o
        LEFT JOIN public.saas_subscriptions s ON s.organization_id = o.id
        WHERE o.trial_ends_at < NOW()
        AND o.subscription_status IS DISTINCT FROM 'active'
        AND o.status = 'active'
        AND (s.bypass_until IS NULL OR s.bypass_until < NOW())
    LOOP
        UPDATE public.organizations
        SET
            status = 'suspended',
            suspended_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;

        -- Log notification
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'trial_expired')
        ON CONFLICT DO NOTHING;

        org_id := r.id;
        org_name := r.name;
        action_taken := 'suspended';
        RETURN NEXT;
    END LOOP;

    -- Mark dormant (30 days no activity)
    FOR r IN
        SELECT o.id, o.name
        FROM public.organizations o
        LEFT JOIN public.saas_subscriptions s ON s.organization_id = o.id
        WHERE o.last_activity_at < NOW() - INTERVAL '30 days'
        AND o.status = 'active'
        AND o.dormant_at IS NULL
        AND (s.bypass_until IS NULL OR s.bypass_until < NOW())
    LOOP
        UPDATE public.organizations
        SET
            dormant_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;

        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'account_dormant')
        ON CONFLICT DO NOTHING;

        org_id := r.id;
        org_name := r.name;
        action_taken := 'marked_dormant';
        RETURN NEXT;
    END LOOP;

    -- Suspend dormant after 60 days total inactivity
    FOR r IN
        SELECT o.id, o.name
        FROM public.organizations o
        LEFT JOIN public.saas_subscriptions s ON s.organization_id = o.id
        WHERE o.last_activity_at < NOW() - INTERVAL '60 days'
        AND o.status = 'active'
        AND o.dormant_at IS NOT NULL
        AND (s.bypass_until IS NULL OR s.bypass_until < NOW())
    LOOP
        UPDATE public.organizations
        SET
            status = 'suspended',
            suspended_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;

        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'account_suspended')
        ON CONFLICT DO NOTHING;

        org_id := r.id;
        org_name := r.name;
        action_taken := 'suspended_dormant';
        RETURN NEXT;
    END LOOP;

    -- Schedule deletion (90 days suspended)
    FOR r IN
        SELECT o.id, o.name
        FROM public.organizations o
        LEFT JOIN public.saas_subscriptions s ON s.organization_id = o.id
        WHERE o.status = 'suspended'
        AND o.suspended_at < NOW() - INTERVAL '90 days'
        AND o.deletion_scheduled_at IS NULL
        AND o.subscription_status IS DISTINCT FROM 'active'
        AND (s.bypass_until IS NULL OR s.bypass_until < NOW())
    LOOP
        UPDATE public.organizations
        SET
            deletion_scheduled_at = NOW() + INTERVAL '30 days',
            updated_at = NOW()
        WHERE id = r.id;

        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'deletion_warning_30d')
        ON CONFLICT DO NOTHING;

        org_id := r.id;
        org_name := r.name;
        action_taken := 'scheduled_deletion';
        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$;
