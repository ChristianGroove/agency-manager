-- Simple fix: Just add the phone column to conversations
-- We'll populate it from the code when new messages arrive

-- Step 1: Add phone column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 2: Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.conversations(phone);

-- Step 3: Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND column_name IN ('phone', 'name', 'channel', 'lead_id');

-- Done! The code will now populate phone numbers for new conversations.
-- For existing conversations, you can manually update or wait for new messages.
