-- Final Robust Bot Triggers Fix
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
            content->>'content', -- Some flows use content.content
            content::text -- fallback to stringified JSON if nothing found
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
BEGIN
    clean_text := public.get_content_text(NEW.content);
    
    -- Fail-Safe detection based on sender name if metadata is missing
    sender_type_val := COALESCE(
        NEW.metadata->>'sender_type', 
        CASE WHEN NEW.sender IN ('System', 'Automation Bot') THEN 'bot' ELSE 'human' END
    );

    UPDATE public.conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = clean_text,
        last_message = NEW.content,
        -- SURGICAL: Update is_bot_active automatically if outbound is from bot
        is_bot_active = CASE 
            WHEN NEW.direction = 'outbound' AND sender_type_val = 'bot' THEN true
            WHEN NEW.direction = 'outbound' AND sender_type_val = 'human' THEN false
            ELSE is_bot_active
        END,
        -- Propagate metadata
        metadata = conversations.metadata || jsonb_build_object(
            'direction', NEW.direction,
            'sender_type', sender_type_val
        ),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Update metrics trigger (Refined)
CREATE OR REPLACE FUNCTION public.update_conversation_metrics()
RETURNS TRIGGER AS $$
DECLARE
    last_wait_duration INTERVAL;
    current_sender_type text;
BEGIN
    current_sender_type := NEW.metadata->>'sender_type';
    
    -- INBOUND Logic
    IF NEW.last_message_direction = 'inbound' THEN
        IF NEW.is_bot_active = false AND NEW.waiting_since IS NULL THEN
            NEW.waiting_since := NOW();
        END IF;
    END IF;

    -- OUTBOUND Logic
    IF NEW.last_message_direction = 'outbound' THEN
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
        ELSIF current_sender_type = 'bot' THEN
            -- Bot replied, ensure is_bot_active is true (already handled in prev trigger but double safety)
            NEW.is_bot_active := TRUE;
            -- We DON'T clear waiting_since here because waiting_since is for HUMAN response
        END IF;
    END IF;

    -- Archive/Closed Logic
    IF NEW.state = 'archived' OR NEW.status = 'closed' THEN
        NEW.waiting_since := NULL;
        NEW.is_bot_active := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
