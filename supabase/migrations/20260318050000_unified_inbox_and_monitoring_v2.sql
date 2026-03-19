-- UNIFIED INBOX & MONITORING REFACTOR
-- Goal: Fix double-counting, ensure real-time presence, and optimize performance.
-- Date: 2026-03-18

BEGIN;

-- 1. DATABASE CONSTRAINTS (DEDUPLICATION)
-- This prevents the root cause of double-counting: duplicate messages from external retries.
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_external_id_unique;
ALTER TABLE public.messages ADD CONSTRAINT messages_external_id_unique UNIQUE (external_id);

-- 2. TRIGGER CLEANUP (SINGLE SOURCE OF TRUTH)
-- Drop all legacy/redundant triggers that might affect unread counts.
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.messages;
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
DROP TRIGGER IF EXISTS on_message_upsert_sync_conversation ON public.messages;

-- 3. UNIFIED SYNC FUNCTION
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
DECLARE
    msg_text TEXT;
    msg_type TEXT;
    v_new_unread_count INT;
BEGIN
    -- Handle content preview
    IF jsonb_typeof(new.content) = 'object' THEN
        msg_type := new.content->>'type';
        msg_text := new.content->>'text';
    ELSE
        msg_type := 'text';
        msg_text := new.content#>>'{}';
    END IF;

    -- Multimedia previews
    IF msg_text IS NULL OR msg_text = '' THEN
        IF msg_type = 'image' THEN msg_text := '📷 Imagen';
        ELSIF msg_type = 'video' THEN msg_text := '🎥 Video';
        ELSIF msg_type = 'audio' THEN msg_text := '🎤 Audio';
        ELSIF msg_type = 'document' THEN msg_text := '📄 Documento';
        ELSE msg_text := 'Nuevo mensaje';
        END IF;
    END IF;

    -- Unread Count Logic: Only increment for INBOUND.
    IF new.direction = 'inbound' THEN
        SELECT COALESCE(unread_count, 0) + 1 INTO v_new_unread_count 
        FROM public.conversations 
        WHERE id = new.conversation_id;
    ELSE
        v_new_unread_count := 0; -- Reset on agent response
    END IF;

    UPDATE public.conversations
    SET 
        last_message = LEFT(msg_text, 255),
        last_message_at = new.created_at,
        updated_at = NOW(),
        unread_count = v_new_unread_count,
        metadata = jsonb_set(
            CASE WHEN jsonb_typeof(COALESCE(metadata, '{}'::jsonb)) = 'object' THEN metadata ELSE '{}'::jsonb END, 
            '{last_message_direction}', 
            to_jsonb(new.direction)
        )
    WHERE id = new.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_upsert_sync_conversation
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- 4. AGENT MONITORING RPC (ROBUST DETECTOR)
CREATE OR REPLACE FUNCTION get_agent_monitoring_stats(p_org_id UUID)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    online BOOLEAN,
    unread_count INT,
    last_interaction_at TIMESTAMPTZ,
    current_load INT,
    max_capacity INT,
    offline_hours_24h FLOAT
) AS $$
BEGIN
    -- Return "Unassigned" row if there are pending chats
    RETURN QUERY
    SELECT 
        '00000000-0000-0000-0000-000000000000'::UUID,
        'Sin asignar'::TEXT,
        NULL::TEXT,
        true,
        COUNT(DISTINCT c.id)::INT,
        MAX(c.last_message_at),
        COUNT(DISTINCT c.id)::INT,
        0,
        0.0::FLOAT
    FROM public.conversations c
    WHERE c.organization_id = p_org_id
      AND c.assigned_to IS NULL
      AND c.status = 'open'
      AND (COALESCE(c.metadata->>'last_message_direction', '') = 'inbound')
    HAVING COUNT(DISTINCT c.id) > 0;

    -- Return Real Agents
    RETURN QUERY
    SELECT 
        m.user_id,
        COALESCE(NULLIF(p.full_name, ''), 'Agente') as uname,
        p.avatar_url,
        (aa.status = 'online' AND aa.last_seen_at > NOW() - INTERVAL '10 minutes') as is_online,
        COALESCE((SELECT COUNT(*)::INT FROM conversations c WHERE c.assigned_to = m.user_id AND c.status = 'open' AND c.metadata->>'last_message_direction' = 'inbound'), 0),
        (SELECT MAX(last_message_at) FROM conversations c WHERE c.assigned_to = m.user_id),
        COALESCE(aa.current_load, 0),
        COALESCE(aa.max_capacity, 10),
        (CASE WHEN aa.last_seen_at > NOW() - INTERVAL '10 minutes' THEN 0.0 ELSE 24.0 END)::FLOAT
    FROM public.organization_members m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    LEFT JOIN public.agent_availability aa ON m.user_id = aa.agent_id AND m.organization_id = aa.organization_id
    WHERE m.organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_assigned ON public.conversations(organization_id, assigned_to);

-- 6. REALTIME REPLICATION
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN OTHERS THEN END; $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN OTHERS THEN END; $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_availability;
EXCEPTION WHEN OTHERS THEN END; $$;

COMMIT;
