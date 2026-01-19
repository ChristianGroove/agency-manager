
-- Migration: Add Multi-Channel Support to Conversations and Messages
-- Description: Updates check constraints to allow messenger, instagram, and evolution channels.

-- 1. Update Conversations Channel Constraint
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_channel_check 
  CHECK (channel IN ('whatsapp', 'email', 'sms', 'messenger', 'instagram', 'evolution'));

-- 2. Add Missing Columns for Preview Support
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message JSONB;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_preview TEXT;

-- 3. Update Messages Channel Constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_channel_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_channel_check 
  CHECK (channel IN ('whatsapp', 'email', 'sms', 'messenger', 'instagram', 'evolution'));

-- 3. Ensure RLS is updated if necessary (mostly not needed here as it depends on org_id)
