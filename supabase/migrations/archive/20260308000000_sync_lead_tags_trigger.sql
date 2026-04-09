-- Migration: Robust TAG Synchronization (ULTIMATE VERSION - NO CIRCULAR UPDATES)
-- Date: 2026-03-09
-- Description: Completely decouples cleanup from sync using a suppression flag.

-- 1. Generic Sync Function (Triggered by manual CRM actions)
CREATE OR REPLACE FUNCTION sync_lead_tags_to_conversations()
RETURNS TRIGGER AS $$
DECLARE
    target_lead_id UUID;
    tag_names TEXT[];
    suppress_sync TEXT;
BEGIN
    -- CRITICAL: Check if sync is suppressed by another process (like cleanup)
    BEGIN
        suppress_sync := current_setting('app.suppress_tag_sync', true);
    EXCEPTION WHEN OTHERS THEN
        suppress_sync := 'false';
    END;

    IF (suppress_sync = 'true') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Standard logic
    IF (TG_TABLE_NAME = 'crm_lead_tags') THEN
        IF (TG_OP = 'DELETE') THEN target_lead_id := OLD.lead_id;
        ELSE target_lead_id := NEW.lead_id; END IF;
    ELSIF (TG_TABLE_NAME = 'leads') THEN
        target_lead_id := NEW.id;
    END IF;
    
    IF target_lead_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    -- Fetch tags
    SELECT ARRAY_AGG(t.name) INTO tag_names 
    FROM crm_lead_tags lt 
    JOIN crm_tags t ON lt.tag_id = t.id 
    WHERE lt.lead_id = target_lead_id;

    -- Update only OPEN conversations. 
    -- Important: we rely on ONLY updating rows that aren't the one currently being modified
    -- by a parent command if this happens to be a nested call (though suppress_sync should cover it).
    UPDATE conversations 
    SET tags = COALESCE(tag_names, '{}'::TEXT[]), updated_at = NOW()
    WHERE lead_id = target_lead_id 
    AND status = 'open' 
    AND tags IS DISTINCT FROM COALESCE(tag_names, '{}'::TEXT[]);

    -- Sync lead array
    IF (TG_TABLE_NAME = 'crm_lead_tags') THEN
        UPDATE leads SET tags = COALESCE(tag_names, '{}'::TEXT[]) 
        WHERE id = target_lead_id AND tags IS DISTINCT FROM COALESCE(tag_names, '{}'::TEXT[]);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cleanup Function (Handles resolution and deletion)
CREATE OR REPLACE FUNCTION handle_conversation_tag_cleanup()
RETURNS TRIGGER AS $$
DECLARE
    target_lead_id UUID;
    active_conv_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN 
        target_lead_id := OLD.lead_id;
        active_conv_id := OLD.id;
    ELSE 
        target_lead_id := NEW.lead_id;
        active_conv_id := NEW.id;
    END IF;

    IF target_lead_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    -- [STEP 1] BEFORE UPDATE: Instant UI fix (Sets NEW.tags to empty)
    IF (TG_WHEN = 'BEFORE' AND TG_OP = 'UPDATE') THEN
        IF (NEW.status = 'closed' AND OLD.status IS DISTINCT FROM NEW.status) THEN
            NEW.tags := '{}'::TEXT[];
        END IF;
        RETURN NEW;
    END IF;

    -- [STEP 2] AFTER DELETE/UPDATE: Data wipe
    IF (TG_WHEN = 'AFTER') THEN
        IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND NEW.status = 'closed' AND OLD.status IS DISTINCT FROM NEW.status) THEN
            
            -- ABORTO: Turn ON suppression to prevent the sync trigger from firing recursively
            PERFORM set_config('app.suppress_tag_sync', 'true', true);
            
            -- Wipe relational tags
            DELETE FROM crm_lead_tags WHERE lead_id = target_lead_id;
            
            -- Clear lead table
            UPDATE leads SET tags = '{}'::TEXT[] WHERE id = target_lead_id;
            
            -- Manually clear other conversations for this lead (Safe because it's id != current)
            UPDATE conversations 
            SET tags = '{}'::TEXT[] 
            WHERE lead_id = target_lead_id 
            AND id != active_conv_id
            AND tags != '{}'::TEXT[];
            
            -- Turn OFF suppression
            PERFORM set_config('app.suppress_tag_sync', 'false', true);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Install Triggers
DROP TRIGGER IF EXISTS trigger_sync_lead_tags_relational ON crm_lead_tags;
CREATE TRIGGER trigger_sync_lead_tags_relational
AFTER INSERT OR DELETE OR UPDATE ON crm_lead_tags
FOR EACH ROW EXECUTE FUNCTION sync_lead_tags_to_conversations();

DROP TRIGGER IF EXISTS trigger_visual_tag_cleanup ON conversations;
CREATE TRIGGER trigger_visual_tag_cleanup
BEFORE UPDATE OF status ON conversations
FOR EACH ROW EXECUTE FUNCTION handle_conversation_tag_cleanup();

DROP TRIGGER IF EXISTS trigger_data_tag_cleanup ON conversations;
CREATE TRIGGER trigger_data_tag_cleanup
AFTER UPDATE OF status OR DELETE ON conversations
FOR EACH ROW EXECUTE FUNCTION handle_conversation_tag_cleanup();
