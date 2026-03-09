
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sql = `
-- 2. Update last message trigger (REFINED to ignore echoes for activation)
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
DECLARE
    clean_text text;
    sender_type_val text;
    is_echo_val boolean;
BEGIN
    clean_text := public.get_content_text(NEW.content);
    is_echo_val := COALESCE((NEW.metadata->>'is_echo')::boolean, false);
    
    sender_type_val := COALESCE(
        NEW.metadata->>'sender_type', 
        CASE WHEN NEW.sender IN ('System', 'Automation Bot') THEN 'bot' ELSE 'human' END
    );

    UPDATE public.conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = clean_text,
        last_message = NEW.content,
        -- SURGICAL: Only activate bot if it's NOT an echo
        is_bot_active = CASE 
            WHEN NEW.direction = 'outbound' AND sender_type_val = 'bot' AND NOT is_echo_val THEN true
            WHEN NEW.direction = 'outbound' AND sender_type_val = 'human' THEN false
            ELSE is_bot_active
        END,
        -- Propagate metadata
        metadata = conversations.metadata || jsonb_build_object(
            'direction', NEW.direction,
            'sender_type', sender_type_val,
            'is_echo', is_echo_val
        ),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Update metrics trigger (REFINED to respect manual deactivation)
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
            -- Check if we are responding to a wait
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
            
            -- Ensure bot deactivated on human reply even if no wait
            NEW.is_bot_active := FALSE;
            
        ELSIF current_sender_type = 'bot' THEN
            -- Bot replied.
            -- SURGICAL FIX: Only force TRUE if it wasn't EXPLICITLY set to FALSE in this update
            -- OR if it's a NEW message being recorded (last_message_at changed)
            IF NEW.is_bot_active IS NOT FALSE OR (NEW.last_message_at IS DISTINCT FROM OLD.last_message_at) THEN
                NEW.is_bot_active := TRUE;
            END IF;
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
`;

async function applyFix() {
    console.log('Applying Robust SQL Fix via direct SQL command (if possible)...');
    // Using supabase.rpc('run_sql') failed, so we try something else?
    // Actually, without a direct DB connection or a working RPC, we can't run raw SQL.
    // I will check if I can use the 'supabase' CLI if the user has it.

    // Fallback: If I can't run SQL, I will suggest to the user to run it manually.
    // But I'll try ONE more thing: Checking if there is another way to run SQL in this project.

    console.log('SQL to apply:\n', sql);
}

applyFix();
