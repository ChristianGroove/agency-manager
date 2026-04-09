-- Migration: Integration Marketplace Schema
-- Creates the provider catalog and links to existing connections

-- 1. Create integration_providers table (Marketplace catalog)
CREATE TABLE IF NOT EXISTS public.integration_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'messaging',
    icon_url TEXT,
    is_premium BOOLEAN DEFAULT false,
    is_enabled BOOLEAN DEFAULT true,
    config_schema JSONB DEFAULT '{}',
    documentation_url TEXT,
    setup_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add provider_id to integration_connections (links installed connections to catalog)
ALTER TABLE public.integration_connections 
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.integration_providers(id) ON DELETE RESTRICT;

-- 3. Create index for provider lookups
CREATE INDEX IF NOT EXISTS idx_providers_category ON public.integration_providers(category);
CREATE INDEX IF NOT EXISTS idx_providers_key ON public.integration_providers(key);
CREATE INDEX IF NOT EXISTS idx_connections_provider ON public.integration_connections(provider_id);

-- 4. Seed default providers
INSERT INTO public.integration_providers (key, name, description, category, icon_url, is_premium, config_schema) VALUES
    ('meta_whatsapp', 'WhatsApp Business', 'Conecta tu línea de WhatsApp Business oficial via Meta Cloud API. Ideal para empresas con verificación comercial.', 'messaging', '/icons/integrations/whatsapp.svg', false, '{"required": ["accessToken", "phoneNumberId", "wabaId"], "properties": {"accessToken": {"type": "string", "title": "Access Token"}, "phoneNumberId": {"type": "string", "title": "Phone Number ID"}, "wabaId": {"type": "string", "title": "WhatsApp Business Account ID"}}}'),
    ('evolution_api', 'WhatsApp (Evolution)', 'Conecta WhatsApp personal o Business mediante Evolution API self-hosted. Mayor flexibilidad y control.', 'messaging', '/icons/integrations/evolution.svg', false, '{"required": ["apiUrl", "apiKey", "instanceName"], "properties": {"apiUrl": {"type": "string", "title": "API URL"}, "apiKey": {"type": "string", "title": "API Key"}, "instanceName": {"type": "string", "title": "Instance Name"}}}'),
    ('meta_instagram', 'Instagram DM', 'Responde mensajes directos de Instagram desde tu inbox unificado.', 'messaging', '/icons/integrations/instagram.svg', false, '{"required": ["accessToken", "pageId"], "properties": {"accessToken": {"type": "string", "title": "Access Token"}, "pageId": {"type": "string", "title": "Page ID"}}}'),
    ('telegram', 'Telegram', 'Conecta un bot de Telegram para atención automatizada y en vivo.', 'messaging', '/icons/integrations/telegram.svg', false, '{"required": ["botToken"], "properties": {"botToken": {"type": "string", "title": "Bot Token"}}}'),
    ('twilio_sms', 'Twilio SMS', 'Envía y recibe SMS tradicionales mediante Twilio.', 'messaging', '/icons/integrations/twilio.svg', true, '{"required": ["accountSid", "authToken", "phoneNumber"], "properties": {"accountSid": {"type": "string", "title": "Account SID"}, "authToken": {"type": "string", "title": "Auth Token"}, "phoneNumber": {"type": "string", "title": "Phone Number"}}}'),
    ('stripe', 'Stripe', 'Procesa pagos y suscripciones con Stripe.', 'payments', '/icons/integrations/stripe.svg', true, '{"required": ["secretKey"], "properties": {"secretKey": {"type": "string", "title": "Secret Key"}, "webhookSecret": {"type": "string", "title": "Webhook Secret"}}}'),
    ('google_calendar', 'Google Calendar', 'Sincroniza citas y disponibilidad con tu calendario.', 'productivity', '/icons/integrations/google-calendar.svg', false, '{"required": ["clientId", "clientSecret"], "properties": {"clientId": {"type": "string", "title": "Client ID"}, "clientSecret": {"type": "string", "title": "Client Secret"}}}'),
    ('openai', 'OpenAI', 'Potencia tu asistente con GPT-4o y modelos avanzados.', 'ai', '/icons/integrations/openai.svg', false, '{"required": ["apiKey"], "properties": {"apiKey": {"type": "string", "title": "API Key"}}}'),
    ('anthropic', 'Anthropic Claude', 'Usa Claude para respuestas más precisas y seguras.', 'ai', '/icons/integrations/anthropic.svg', false, '{"required": ["apiKey"], "properties": {"apiKey": {"type": "string", "title": "API Key"}}}')
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    config_schema = EXCLUDED.config_schema,
    updated_at = now();

-- 5. Backfill existing connections with provider_id
UPDATE public.integration_connections ic
SET provider_id = ip.id
FROM public.integration_providers ip
WHERE ic.provider_key = ip.key
  AND ic.provider_id IS NULL;

-- 6. RLS Policies for providers (read-only for all authenticated users)
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_providers_read_all" ON public.integration_providers
    FOR SELECT TO authenticated
    USING (is_enabled = true);

-- Admin-only for modifications
CREATE POLICY "integration_providers_admin_all" ON public.integration_providers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
    );

COMMENT ON TABLE public.integration_providers IS 'Catalog of available integrations for the marketplace';
COMMENT ON COLUMN public.integration_providers.key IS 'Unique provider identifier used in code (e.g., meta_whatsapp)';
COMMENT ON COLUMN public.integration_providers.config_schema IS 'JSON Schema defining required credentials for setup';
COMMENT ON COLUMN public.integration_providers.is_premium IS 'If true, may require paid plan to install';
