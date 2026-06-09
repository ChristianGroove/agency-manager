-- Increase inbox agent capacity from 50 to 100.
-- Preserve custom capacities below 50; only lift agents still on the old platform default.

BEGIN;

ALTER TABLE public.agent_availability
    ALTER COLUMN max_capacity SET DEFAULT 100;

CREATE OR REPLACE FUNCTION public.handle_new_org_member_agent()
RETURNS TRIGGER AS $$
BEGIN
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
        100,
        0,
        true,
        now()
    )
    ON CONFLICT (organization_id, agent_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE public.agent_availability
SET max_capacity = 100,
    updated_at = now()
WHERE max_capacity = 50;

COMMIT;
