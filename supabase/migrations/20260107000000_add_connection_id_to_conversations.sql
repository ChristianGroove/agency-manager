-- Add connection_id to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES integration_connections(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_connection_id ON conversations(connection_id);
