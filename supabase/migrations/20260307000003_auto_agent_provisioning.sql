-- Phase 5: UX Simplification & Automation
-- Mission: Automate agent provisioning and keep channel mapping in sync with permissions.

BEGIN;

-- 1. Create Function for Automatic Agent Availability Provisioning
CREATE OR REPLACE FUNCTION public.handle_new_org_member_agent()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create agent availability if it doesn't exist
    INSERT INTO public.agent_availability (
        organization_id,
        agent_id,
        status,
        max_capacity,
        current_load,
        auto_assign_enabled,
        last_seen_at
    )
    VALUES (
        NEW.organization_id,
        NEW.user_id,
        'offline',
        5,  -- Default optimal capacity
        0,
        false,
        now()
    )
    ON CONFLICT (organization_id, agent_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: On new organization member
DROP TRIGGER IF EXISTS tr_auto_provision_agent ON public.organization_members;
CREATE TRIGGER tr_auto_provision_agent
    AFTER INSERT ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_org_member_agent();

-- 2. Create Function for Real-time Channel Sync
-- Sincroniza la tabla física agent_channels basada en el JSONB de permisos
CREATE OR REPLACE FUNCTION public.sync_agent_channels_from_permissions()
RETURNS TRIGGER AS $$
DECLARE
    v_channel_type TEXT;
    inbox_access JSONB;
BEGIN
    inbox_access := NEW.permissions->'inbox_access';
    
    -- 1. Clear existing channel mappings for this agent
    DELETE FROM public.agent_channels 
    WHERE organization_id = NEW.organization_id AND agent_id = NEW.user_id;
    
    -- 2. If inbox_access is a list of Strings, insert them
    IF inbox_access IS NOT NULL AND jsonb_array_length(inbox_access) > 0 THEN
        FOR v_channel_type IN 
            SELECT jsonb_array_elements_text(inbox_access)
        LOOP
            INSERT INTO public.agent_channels (organization_id, agent_id, channel_type)
            VALUES (NEW.organization_id, NEW.user_id, v_channel_type)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: On member permission update
DROP TRIGGER IF EXISTS tr_sync_agent_channels ON public.organization_members;
CREATE TRIGGER tr_sync_agent_channels
    AFTER UPDATE OF permissions ON public.organization_members
    FOR EACH ROW
    WHEN (OLD.permissions->'inbox_access' IS DISTINCT FROM NEW.permissions->'inbox_access')
    EXECUTE FUNCTION public.sync_agent_channels_from_permissions();

-- Helper for initial sync (reusable logic)
CREATE OR REPLACE FUNCTION public.sync_agent_channels_from_permissions_by_data(p_org_id UUID, p_user_id UUID, p_permissions JSONB)
RETURNS VOID AS $$
DECLARE
    v_channel_type TEXT;
    inbox_access JSONB;
BEGIN
    inbox_access := p_permissions->'inbox_access';
    DELETE FROM public.agent_channels WHERE organization_id = p_org_id AND agent_id = p_user_id;
    
    IF inbox_access IS NOT NULL AND jsonb_array_length(inbox_access) > 0 THEN
        FOR v_channel_type IN SELECT jsonb_array_elements_text(inbox_access) LOOP
            INSERT INTO public.agent_channels (organization_id, agent_id, channel_type)
            VALUES (p_org_id, p_user_id, v_channel_type) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Initial Sync: Provision current members who aren't agents yet
-- And sync existing permissions to the new physical table
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Provision missing agent records
    INSERT INTO public.agent_availability (organization_id, agent_id, status, max_capacity, current_load, auto_assign_enabled)
    SELECT organization_id, user_id, 'offline', 5, 0, false
    FROM public.organization_members
    ON CONFLICT DO NOTHING;

    -- Sync physical channel table for everyone
    FOR r IN SELECT organization_id, user_id, permissions FROM public.organization_members LOOP
        PERFORM public.sync_agent_channels_from_permissions_by_data(r.organization_id, r.user_id, r.permissions);
    END LOOP;
END $$;

COMMIT;
