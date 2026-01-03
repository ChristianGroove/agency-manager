-- Helper function to increment agent load
CREATE OR REPLACE FUNCTION increment_agent_load(agent_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.agent_availability
    SET current_load = current_load + 1,
        updated_at = NOW()
    WHERE agent_availability.agent_id = increment_agent_load.agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to decrement agent load
CREATE OR REPLACE FUNCTION decrement_agent_load(agent_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.agent_availability
    SET current_load = GREATEST(0, current_load - 1),
        updated_at = NOW()
    WHERE agent_availability.agent_id = decrement_agent_load.agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update agent load when conversation is assigned
CREATE OR REPLACE FUNCTION update_agent_load_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- If assignment changed
    IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
        -- Decrement old agent's load
        IF OLD.assigned_to IS NOT NULL THEN
            PERFORM decrement_agent_load(OLD.assigned_to);
        END IF;
        
        -- Increment new agent's load
        IF NEW.assigned_to IS NOT NULL THEN
            PERFORM increment_agent_load(NEW.assigned_to);
        END IF;
    END IF;
    
    -- If new conversation assigned
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
        PERFORM increment_agent_load(NEW.assigned_to);
    END IF;
    
    -- If conversation closed, decrement load
    IF (TG_OP = 'UPDATE' AND NEW.status = 'archived' AND OLD.status != 'archived' AND NEW.assigned_to IS NOT NULL) THEN
        PERFORM decrement_agent_load(NEW.assigned_to);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to conversations table
DROP TRIGGER IF EXISTS trigger_update_agent_load ON public.conversations;
CREATE TRIGGER trigger_update_agent_load
    AFTER INSERT OR UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_load_on_assignment();
