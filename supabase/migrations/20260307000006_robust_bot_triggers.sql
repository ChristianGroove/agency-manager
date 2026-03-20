-- Final Robust Bot Triggers Fix (V2 - Compatibility Restored)
-- This version restores 'last_message_direction' key for Agent Monitor Widget compatibility.

-- 1. Function to extract clean text from JSON content
CREATE OR REPLACE FUNCTION public.get_content_text(content jsonb)
RETURNS text AS $$
BEGIN
    -- Handle strings
    IF jsonb_typeof(content) = 'string' THEN
        RETURN content#>>'{}';
    END IF;
    
    -- Handle objects
    IF jsonb_typeof(content) = 'object' THEN
        RETURN COALESCE(
            content->>'body', 
            content->>'text', 
            content->>'content',
            content::text 
        );
    END IF;
    
    RETURN content::text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Update last message trigger
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
DECLARE
    clean_text text;
    sender_type_val text;
    v_new_unread_count int;
BEGIN
    clean_text := public.get_content_text(NEW.content);
    
    -- Sender type detection
    sender_type_val := COALESCE(
        NEW.metadata->>'sender_type', 
        CASE 
            WHEN NEW.sender = 'System' THEN 'neutral' 
            WHEN NEW.sender = 'Automation Bot' THEN 'bot' 
            ELSE 'human' 
        END
    );

    -- Unread Count Logic (RESTORED)
    IF NEW.direction = 'inbound' THEN
        SELECT COALESCE(unread_count, 0) + 1 INTO v_new_unread_count 
        FROM public.conversations 
        WHERE id = NEW.conversation_id;
    ELSE
        v_new_unread_count := 0; -- Reset on ANY outbound
    END IF;

    UPDATE public.conversations
    SET 
        last_message_at = NEW.created_at,
        last_message = LEFT(clean_text, 255), -- Restore as STRING preview for UI comp
        unread_count = v_new_unread_count,
        -- SURGICAL Bot State Logic
        is_bot_active = CASE 
            WHEN NEW.direction = 'outbound' AND sender_type_val = 'bot' THEN true
            WHEN NEW.direction = 'outbound' AND sender_type_val = 'human' THEN false
            ELSE is_bot_active
        END,
        -- COMPATIBILITY: Restore 'last_message_direction' for Widget
        metadata = conversations.metadata || jsonb_build_object(
            'last_message_direction', NEW.direction,
            'sender_type', sender_type_val
        ),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Update metrics trigger (Fixed references for metadata keys)
CREATE OR REPLACE FUNCTION public.update_conversation_metrics()
RETURNS TRIGGER AS $$
DECLARE
    last_wait_duration INTERVAL;
    current_sender_type text;
    last_dir text;
BEGIN
    current_sender_type := NEW.metadata->>'sender_type';
    last_dir := NEW.metadata->>'last_message_direction';
    
    -- INBOUND Logic
    IF last_dir = 'inbound' THEN
        IF NEW.is_bot_active = false AND NEW.waiting_since IS NULL THEN
            NEW.waiting_since := NOW();
        END IF;
    END IF;

    -- OUTBOUND Logic
    IF last_dir = 'outbound' THEN
        -- If human agent replied
        IF current_sender_type = 'human' THEN
            IF NEW.waiting_since IS NOT NULL THEN
                last_wait_duration := NOW() - NEW.waiting_since;
                NEW.last_responded_at := NOW();
                
                IF NEW.average_response_time_seconds = 0 THEN
                    NEW.average_response_time_seconds := EXTRACT(EPOCH FROM last_wait_duration)::INTEGER;
                ELSE
                    NEW.average_response_time_seconds := (NEW.average_response_time_seconds + EXTRACT(EPOCH FROM last_wait_duration)::INTEGER) / 2;
                END IF;
                
                NEW.waiting_since := NULL;
                NEW.is_bot_active := FALSE;
            END IF;
        END IF;
    END IF;

    -- Archive/Closed Logic
    IF NEW.state = 'archived' OR NEW.status = 'closed' THEN
        NEW.waiting_since := NULL;
        NEW.is_bot_active := FALSE;
    END IF;

    -- Ensure unread_count is never null
    IF NEW.unread_count IS NULL THEN
        NEW.unread_count := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
