-- Add connection_id to conversations for Multi-Account support
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_connection ON public.conversations(connection_id);

-- Add comment
COMMENT ON COLUMN public.conversations.connection_id IS 'Specific integration connection used for this conversation. Critical for multi-account routing.';
