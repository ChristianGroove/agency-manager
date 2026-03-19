-- ENSURE REALTIME REPLICATION IS ENABLED
-- These tables are used in Realtime Postgres Changes listeners
-- If replication is not enabled, the subscribe() function returns a CHANNEL_ERROR.

BEGIN;

-- 1. Ensure the publication exists (usually created by Supabase)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Add tables to replication one by one safely
-- We use a loop or separate statements to handle tables that might already be added
DO $$
BEGIN
    -- messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    -- conversations
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;

    -- agent_availability
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'agent_availability'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_availability;
    END IF;
END $$;

COMMIT;
