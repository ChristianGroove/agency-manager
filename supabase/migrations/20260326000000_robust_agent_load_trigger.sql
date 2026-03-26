-- Robust Agent Load Synchronization
-- Goal: Ensure current_load is always accurate based on 'active' conversations.
-- Date: 2026-03-26

BEGIN;

-- 1. Function to recalculate load for a specific agent
CREATE OR REPLACE FUNCTION public.fn_recalculate_agent_load(p_agent_id UUID)
RETURNS void AS $$
DECLARE
    v_actual_load INT;
BEGIN
    SELECT COUNT(*)::INT INTO v_actual_load
    FROM public.conversations
    WHERE assigned_to = p_agent_id
      AND state = 'active'
      AND status IN ('open', 'snoozed');

    UPDATE public.agent_availability
    SET current_load = v_actual_load,
        updated_at = NOW()
    WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function to handle all state/assignment changes
CREATE OR REPLACE FUNCTION public.fn_sync_agent_load_on_change()
RETURNS TRIGGER AS $$
BEGIN
    -- CASE: Assignment changed (Manual or Auto)
    IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
        IF OLD.assigned_to IS NOT NULL THEN
            PERFORM public.fn_recalculate_agent_load(OLD.assigned_to);
        END IF;
        IF NEW.assigned_to IS NOT NULL THEN
            PERFORM public.fn_recalculate_agent_load(NEW.assigned_to);
        END IF;
    
    -- CASE: New conversation with assignment
    ELSIF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
        PERFORM public.fn_recalculate_agent_load(NEW.assigned_to);
    
    -- CASE: Status or State changed (Archive, Spam, Delete, Snooze, etc.)
    ELSIF (TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT NULL AND 
          (OLD.status IS DISTINCT FROM NEW.status OR OLD.state IS DISTINCT FROM NEW.state)) THEN
        PERFORM public.fn_recalculate_agent_load(NEW.assigned_to);
    
    -- CASE: Conversation deleted
    ELSIF (TG_OP = 'DELETE' AND OLD.assigned_to IS NOT NULL) THEN
        PERFORM public.fn_recalculate_agent_load(OLD.assigned_to);
    END IF;

    RETURN NULL; -- AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Replace legacy trigger
DROP TRIGGER IF EXISTS trigger_update_agent_load ON public.conversations;
CREATE TRIGGER trigger_update_agent_load
    AFTER INSERT OR UPDATE OR DELETE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_agent_load_on_change();

-- 4. Correct capacities and perform initial reconciliation
UPDATE public.agent_availability 
SET max_capacity = 50 
WHERE max_capacity < 50 OR max_capacity IS NULL;

-- Initial reconciliation for all agents
-- (Using the function defined in 20260324 migration)
SELECT * FROM public.reconcile_agent_loads();

COMMIT;
