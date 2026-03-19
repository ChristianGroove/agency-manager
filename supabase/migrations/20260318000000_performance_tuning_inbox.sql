-- Migration: 20260318000000_performance_tuning_inbox.sql
-- Description: Add composite indexes for Agent Monitoring RPC and Inbox lookups

-- 1. Optimize get_agent_monitoring_stats RPC (Actionable/Unassigned counts)
-- This index covers the specific filters used in the monitoring dashboard
CREATE INDEX IF NOT EXISTS idx_conversations_monitoring_unassigned 
ON public.conversations(organization_id, assigned_to, status, state) 
WHERE assigned_to IS NULL AND status = 'open';

-- 2. Optimize assigned actionable conversations
CREATE INDEX IF NOT EXISTS idx_conversations_monitoring_assigned
ON public.conversations(organization_id, assigned_to, status, state)
WHERE assigned_to IS NOT NULL AND status = 'open';

-- 3. Optimize metadata-based direction lookups (Last message direction)
-- This speeds up the "last message was inbound" filter in the RPC
CREATE INDEX IF NOT EXISTS idx_conversations_last_direction 
ON public.conversations((metadata->>'last_message_direction'));
