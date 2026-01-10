-- Migration: CRM Integration Optimization (Phase 3)
-- Adds rate limiting for auto-replies and lead attribution

-- 1. Add last_auto_reply_at to conversations (for rate limiting auto-replies)
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS last_auto_reply_at TIMESTAMPTZ;

COMMENT ON COLUMN public.conversations.last_auto_reply_at IS 'Timestamp of last auto-reply sent, used for rate limiting';

-- 2. Add source_connection_id to leads (for attribution analytics)
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS source_connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.leads.source_connection_id IS 'WhatsApp line that originally captured this lead';

-- 3. Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_leads_source_connection ON public.leads(source_connection_id) 
  WHERE source_connection_id IS NOT NULL;

-- 4. Create index for conversations by connection (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_conversations_connection ON public.conversations(connection_id) 
  WHERE connection_id IS NOT NULL;
