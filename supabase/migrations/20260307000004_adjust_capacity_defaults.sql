-- Phase 7: UX Polish & Capacity Update
-- Mission: Increase default capacity and support specialized system messages.

BEGIN;

-- 1. Update default for max_capacity in agent_availability
ALTER TABLE public.agent_availability ALTER COLUMN max_capacity SET DEFAULT 50;

-- 2. Update existing agents to have the new 50 capacity
UPDATE public.agent_availability SET max_capacity = 50 WHERE max_capacity < 50;

-- 3. Update the handle_new_org_member_agent function to use 50
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
        50,  -- Updated to 50
        0,
        false,
        now()
    )
    ON CONFLICT (organization_id, agent_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Clean up mass provisioning if needed (ensure parity)
UPDATE public.agent_availability SET max_capacity = 50 WHERE max_capacity IS NOT NULL;

COMMIT;
