-- Migration: 20260118120000_performance_indexes.sql
-- Description: Add critical indexes for messaging performance

-- 1. Accelerate Chat History Loading (Critical for Inbox)
-- Allows fetching messages for a specific conversation sorted by time without scanning the whole table
CREATE INDEX IF NOT EXISTS idx_messages_history ON public.messages(conversation_id, created_at);

-- 2. Optimize Webhook Lookups (Critical for Message Reception)
-- Faster lookup when checking if a conversation exists for a specific channel + lead
CREATE INDEX IF NOT EXISTS idx_conversations_lookup ON public.conversations(channel, lead_id);

-- 3. Optimize Queue Processing
-- Faster finding of pending tasks or marketing enrollments
CREATE INDEX IF NOT EXISTS idx_marketing_enrollments_next_run ON public.marketing_enrollments(next_run_at) WHERE status = 'scheduled';
