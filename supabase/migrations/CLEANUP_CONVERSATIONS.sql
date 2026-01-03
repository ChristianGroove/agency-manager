-- Quick cleanup: Delete old test conversations without phone numbers
-- Execute this in Supabase SQL Editor

-- Option 1: Delete ALL conversations (nuclear option - use with caution!)
-- Uncomment if you want to start fresh:
-- DELETE FROM public.messages;
-- DELETE FROM public.conversations;

-- Option 2: Delete only conversations without phone (safer)
DELETE FROM public.conversations 
WHERE phone IS NULL;

-- Option 3: Archive old conversations instead of deleting
-- UPDATE public.conversations 
-- SET state = 'archived'
-- WHERE phone IS NULL;

-- Verify what's left
SELECT 
    id,
    phone,
    channel,
    state,
    last_message,
    created_at
FROM public.conversations
ORDER BY created_at DESC;
