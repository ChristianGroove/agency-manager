-- Migration: Add Response Time Tracking and Bot Logic
-- Description: Adds fields to track how long a customer waits for a human agent and whether a bot is currently active.

-- 1. Add columns to conversations
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS waiting_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_bot_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_message_direction TEXT,
  ADD COLUMN IF NOT EXISTS last_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS average_response_time_seconds INTEGER DEFAULT 0;

-- 2. Create a function to handle conversation response metrics
CREATE OR REPLACE FUNCTION public.update_conversation_metrics()
RETURNS TRIGGER AS $$
DECLARE
    last_wait_duration INTERVAL;
BEGIN
    -- Determine direction
    NEW.last_message_direction := NEW.metadata->>'direction';
    
    -- LOGIC FOR INBOUND MESSAGES (Customer writes)
    IF NEW.last_message_direction = 'inbound' THEN
        -- Only set waiting_since if bot is NOT active and we weren't already waiting
        IF NEW.is_bot_active = false AND NEW.waiting_since IS NULL THEN
            NEW.waiting_since := NOW();
        END IF;
    END IF;

    -- LOGIC FOR OUTBOUND MESSAGES (Agent or Bot writes)
    IF NEW.last_message_direction = 'outbound' THEN
        -- If it was a human agent replying (metadata->>'sender_type' != 'bot')
        IF (NEW.metadata->>'sender_type') IS DISTINCT FROM 'bot' THEN
            IF NEW.waiting_since IS NOT NULL THEN
                -- Calculate response time
                last_wait_duration := NOW() - NEW.waiting_since;
                NEW.last_responded_at := NOW();
                
                -- Update rolling average (simplified)
                IF NEW.average_response_time_seconds = 0 THEN
                    NEW.average_response_time_seconds := EXTRACT(EPOCH FROM last_wait_duration)::INTEGER;
                ELSE
                    NEW.average_response_time_seconds := (NEW.average_response_time_seconds + EXTRACT(EPOCH FROM last_wait_duration)::INTEGER) / 2;
                END IF;
                
                -- Clear waiting status and deactivate bot
                NEW.waiting_since := NULL;
                NEW.is_bot_active := FALSE;
            END IF;
        ELSE
            -- It was a bot reply
            -- We don't clear waiting_since here because waiting_since represents waiting for a HUMAN.
            -- However, if the bot is active, waiting_since should already be NULL.
        END IF;
    END IF;

    -- LOGIC FOR CLOSING CHATS
    IF NEW.state = 'archived' OR NEW.status = 'closed' THEN
        NEW.waiting_since := NULL;
        NEW.is_bot_active := FALSE;
        -- SURGICAL: Update resolved_at marker for automation session logic
        NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{resolved_at}', to_jsonb(NOW()));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Update the conversations trigger
-- Assuming update_conversation_last_message already exists, we weave our logic into it or add a new one.
-- To be surgical, we add a dedicated trigger for metrics.
DROP TRIGGER IF EXISTS tr_update_conversation_metrics ON public.conversations;
CREATE TRIGGER tr_update_conversation_metrics
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_metrics();

-- 4. Helper to toggle bot status from workflow engine
CREATE OR REPLACE FUNCTION public.set_conversation_bot_status(conv_id UUID, bot_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE public.conversations 
    SET 
        is_bot_active = bot_active,
        -- If we are disabling the bot, and the last message was inbound, start waiting timer NOW
        waiting_since = CASE 
            WHEN bot_active = false AND last_message_direction = 'inbound' THEN NOW() 
            ELSE waiting_since 
        END
    WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql;
