-- Migration: Create Unified Messaging Schema
-- Description: Establishes the foundation for omnichannel messaging (WhatsApp, Email, etc.)
-- Author: Antigravity
-- Date: 2026-01-02

-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Related Entities (Nullable as a conversation might be initially unlinked or linked to visitor)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Channel Info
  channel VARCHAR(50) NOT NULL, -- 'whatsapp', 'email', 'messenger', 'instagram', 'sms'
  external_id VARCHAR(255), -- ID del chat en el servicio externo (ej: WaID)
  
  -- Metadata
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'archived', 'snoozed'
  priority VARCHAR(20) DEFAULT 'medium',
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Sorting & Display
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Direction & Sender
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Null if inbound or system
  
  -- Content
  content TEXT, 
  content_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'video', 'document', 'audio', 'template'
  
  -- Media / Rich Content
  media_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store template params, file sizes, etc.
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'sent', -- 'sending', 'sent', 'delivered', 'read', 'failed'
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(organization_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);

-- 4. Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Organization Isolation)

-- Conversations Policies
CREATE POLICY "Users can view conversations of their organization"
  ON conversations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert conversations for their organization"
  ON conversations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversations of their organization"
  ON conversations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Messages Policies (Inherit from Conversation)
CREATE POLICY "Users can view messages of their organization's conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations c
      WHERE c.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert messages into their organization's conversations"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations c
      WHERE c.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- 6. Updated_at Trigger for Conversations
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_timestamp
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- 7. Auto-update Last Message on new Message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = COALESCE(NEW.content, 'Multimedia attachment'),
    -- Increment unread if inbound ? (Logic usually handled by app, but can be here)
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conv_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();
