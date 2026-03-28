-- Fix Realtime Consistency and Performance
-- Goal: Ensure instant updates in Sidebar and Chat Area by enabling FULL replica identity.
-- Date: 2026-03-27

BEGIN;

-- 1. Ensure tables are in the realtime publication
-- We use a DO block to avoid errors if they are already there
DO $$ 
BEGIN
  -- Conversations
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  -- Messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  -- Leads (Optional but helpful for sidebar info)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END $$;

-- 2. Set REPLICA IDENTITY FULL
-- This ensures that the 'old' and 'new' records in Realtime payloads contain ALL columns.
-- Without this, some updates might not trigger the UI correctly or will lack data.
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;

COMMIT;
