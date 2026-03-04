-- Complete diagnostic and fix script for Inbox <> CRM integration

-- PART 1: Check current schema
SELECT 
    'leads' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'leads'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
    'conversations' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- PART 2: Check current data state
SELECT 
    'Current Conversations' as section,
    c.id,
    c.phone as conv_phone,
    c.channel,
    c.lead_id,
    l.phone as lead_phone,
    l.name as lead_name,
    c.created_at
FROM conversations c
LEFT JOIN leads l ON c.lead_id = l.id
ORDER BY c.created_at DESC
LIMIT 5;

-- PART 3: Check messages to see what data we have
SELECT 
    'Message Data' as section,
    m.id,
    m.conversation_id,
    m.content,
    m.metadata,
    m.created_at
FROM messages m
ORDER BY m.created_at DESC
LIMIT 5;

-- PART 4: Fix script (run after reviewing above)
-- Uncomment to execute:

/*
-- Update conversations with phone from message metadata
UPDATE conversations c
SET phone = (
    SELECT (m.metadata->>'from_number')::text
    FROM messages m
    WHERE m.conversation_id = c.id
    AND m.metadata->>'from_number' IS NOT NULL
    LIMIT 1
)
WHERE c.phone IS NULL OR c.phone = '';

-- Update leads with phone from conversations
UPDATE leads l
SET phone = c.phone
FROM conversations c
WHERE c.lead_id = l.id
AND (l.phone IS NULL OR l.phone = '')
AND c.phone IS NOT NULL;

-- Update lead names to use phone if no name
UPDATE leads
SET name = phone
WHERE (name IS NULL OR name = '' OR name = 'Unknown Contact')
AND phone IS NOT NULL;
*/
