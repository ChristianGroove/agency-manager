
-- Add client_id to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);

-- Optional: Add comment
COMMENT ON COLUMN public.conversations.client_id IS 'Link to clients table (for manually created contacts independent of leads)';
