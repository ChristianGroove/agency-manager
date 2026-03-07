-- Phase 2: Database Normalization
-- Mission: Unify channel types and ensure consistency across conversations and messages.

BEGIN;

-- 1. Create a Master Channel Types table (Reference)
CREATE TABLE IF NOT EXISTS public.channel_definitions (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider_key TEXT, -- meta_cloud, evolution_api, etc.
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed basic channel types
INSERT INTO public.channel_definitions (slug, name, provider_key) VALUES
('whatsapp', 'WhatsApp Business', 'meta_cloud'),
('messenger', 'Facebook Messenger', 'meta_business'),
('instagram', 'Instagram DM', 'meta_business'),
('evolution', 'WhatsApp (Evolution)', 'evolution_api'),
('email', 'Email', 'resend'),
('sms', 'SMS', 'twilio')
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    provider_key = EXCLUDED.provider_key;

-- 2. Update Conversations constraint to be driven by definitions (via Trigger or complex check)
-- For now, we align the explicit check constraint with the master list.
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_channel_check 
  CHECK (channel IN ('whatsapp', 'messenger', 'instagram', 'evolution', 'email', 'sms'));

-- 3. Update Messages constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_channel_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_channel_check 
  CHECK (channel IN ('whatsapp', 'messenger', 'instagram', 'evolution', 'email', 'sms'));

-- 4. Cleanup legacy channel references if any (None found in audit, but good practice)

COMMIT;
