-- PERFORMANCE: Composite indices for Inbox scalability
-- These indices are critical for cursor-based pagination and sidebar speed.

-- 1. Messages: Accelerates pagination queries (conversation_id + created_at DESC)
-- Used by: chat-area.tsx fetchMessages, loadOlderMessages
-- Before: sequential scan on messages filtered by conversation_id, then sort by created_at
-- After: direct index scan, ~5-20x faster for conversations with thousands of messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON public.messages (conversation_id, created_at DESC);

-- 2. Conversations: Accelerates sidebar/inbox list queries (organization_id + last_message_at DESC)
-- Used by: sidebar-conversation-list.tsx fetchConversations
-- Before: index on organization_id alone, then sort by last_message_at in memory
-- After: combined index serves both filter AND sort in a single scan
CREATE INDEX IF NOT EXISTS idx_conversations_org_lastmsg
ON public.conversations (organization_id, last_message_at DESC);

-- Refresh statistics
ANALYZE public.messages;
ANALYZE public.conversations;
