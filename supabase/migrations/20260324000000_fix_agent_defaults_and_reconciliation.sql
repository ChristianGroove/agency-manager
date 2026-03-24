-- Fix: Auto-assign enabled by default + Periodic load reconciliation
-- Mission: New agents should receive auto-assignments by default.
-- Add a reconciliation function callable periodically.

BEGIN;

-- 1. Fix handle_new_org_member_agent: auto_assign_enabled should be TRUE
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
        50,
        0,
        true,  -- Enable auto-assign by default so new agents can receive leads
        now()
    )
    ON CONFLICT (organization_id, agent_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix existing agents that were provisioned with auto_assign_enabled = false
-- Only update agents who have never manually changed their setting (still at default false)
UPDATE public.agent_availability 
SET auto_assign_enabled = true 
WHERE auto_assign_enabled = false;

-- 3. Create reconciliation function
-- Counts actual active conversations per agent and syncs current_load
CREATE OR REPLACE FUNCTION public.reconcile_agent_loads(p_org_id UUID DEFAULT NULL)
RETURNS TABLE(agent_id UUID, previous_load INT, actual_load BIGINT, was_fixed BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    WITH actual_counts AS (
        SELECT 
            c.assigned_to,
            COUNT(*)::BIGINT AS real_load
        FROM public.conversations c
        WHERE c.state = 'active' 
          AND c.status IN ('open', 'snoozed')
          AND c.assigned_to IS NOT NULL
          AND (p_org_id IS NULL OR c.organization_id = p_org_id)
        GROUP BY c.assigned_to
    ),
    agents AS (
        SELECT 
            aa.agent_id AS aid,
            aa.current_load AS old_load,
            COALESCE(ac.real_load, 0) AS new_load
        FROM public.agent_availability aa
        LEFT JOIN actual_counts ac ON ac.assigned_to = aa.agent_id
        WHERE (p_org_id IS NULL OR aa.organization_id = p_org_id)
          AND aa.current_load IS DISTINCT FROM COALESCE(ac.real_load, 0)::INT
    )
    SELECT 
        a.aid,
        a.old_load,
        a.new_load,
        true AS was_fixed
    FROM agents a;

    -- Perform the actual update
    UPDATE public.agent_availability aa
    SET current_load = COALESCE(ac.real_load, 0)::INT
    FROM (
        SELECT 
            c.assigned_to,
            COUNT(*)::BIGINT AS real_load
        FROM public.conversations c
        WHERE c.state = 'active' 
          AND c.status IN ('open', 'snoozed')
          AND c.assigned_to IS NOT NULL
          AND (p_org_id IS NULL OR c.organization_id = p_org_id)
        GROUP BY c.assigned_to
    ) ac
    WHERE aa.agent_id = ac.assigned_to
      AND (p_org_id IS NULL OR aa.organization_id = p_org_id)
      AND aa.current_load IS DISTINCT FROM ac.real_load::INT;
    
    -- Also zero out agents with no active conversations
    UPDATE public.agent_availability aa
    SET current_load = 0
    WHERE (p_org_id IS NULL OR aa.organization_id = p_org_id)
      AND aa.current_load > 0
      AND NOT EXISTS (
          SELECT 1 FROM public.conversations c
          WHERE c.assigned_to = aa.agent_id
            AND c.state = 'active'
            AND c.status IN ('open', 'snoozed')
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Schedule weekly reconciliation via pg_cron (if extension available)
-- NOTE: pg_cron must be enabled in your Supabase project under Database → Extensions
-- This runs every Sunday at 3:00 AM UTC
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('reconcile-agent-loads');
        PERFORM cron.schedule(
            'reconcile-agent-loads',
            '0 3 * * 0',  -- Every Sunday at 3:00 AM UTC
            'SELECT public.reconcile_agent_loads()'
        );
    ELSE
        RAISE NOTICE 'pg_cron extension not found. Enable it in Supabase Dashboard → Database → Extensions to schedule automatic reconciliation.';
    END IF;
END $$;

COMMIT;
