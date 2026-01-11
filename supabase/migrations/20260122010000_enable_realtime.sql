-- Enable Realtime for Messages and Conversations
-- This allows the Chat UI to receive live updates

BEGIN;

  -- Ensure the publication exists (standard Supabase setup)
  -- If it doesn't, we create it (unlikely in Supabase env, but safe)
  -- DO $$
  -- BEGIN
  --   IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
  --     CREATE PUBLICATION supabase_realtime;
  --   END IF;
  -- END
  -- $$;

  -- Add tables to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

COMMIT;
