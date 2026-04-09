-- ============================================
-- INTEGRATION CONNECTIONS SYSTEM
-- Date: 2026-01-04
-- ============================================

-- 1. INTEGRATION CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.integration_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    provider_key TEXT NOT NULL, -- e.g., 'meta_whatsapp', 'google_mail', 'stripe'
    connection_name TEXT NOT NULL, -- e.g., 'Sales WhatsApp', 'Support Email'
    credentials JSONB DEFAULT '{}'::jsonb, -- ENCRYPTED sensitive data (tokens, keys)
    config JSONB DEFAULT '{}'::jsonb, -- Public/Non-sensitive config (e.g., auto-reply settings)
    status TEXT DEFAULT 'active', -- 'active', 'disconnected', 'error', 'expired'
    metadata JSONB DEFAULT '{}'::jsonb, -- Profile info: avatar, email, phone number
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by org and provider
CREATE INDEX IF NOT EXISTS idx_integration_connections_org_provider 
ON public.integration_connections(organization_id, provider_key);

COMMENT ON TABLE public.integration_connections IS 'Stores active external integrations for organizations';
COMMENT ON COLUMN public.integration_connections.credentials IS 'SENSITIVE: Should hold encrypted tokens/keys';

-- 2. RLS POLICIES
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

-- Policy: View (Organization Members)
-- Allow all members to VIEW connections (to know what's connected)
CREATE POLICY integration_connections_view_members ON public.integration_connections
FOR SELECT TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Policy: Manage (Organization Admins/Owners)
-- Only Admins/Owners can CREATE, UPDATE, DELETE
CREATE POLICY integration_connections_manage_admins ON public.integration_connections
FOR ALL TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
)
WITH CHECK (
    organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
);

-- 3. TRIGGER FOR UPDATED_AT
CREATE TRIGGER update_integration_connections_modtime
    BEFORE UPDATE ON public.integration_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. HELPER FUNCTION (Optional - Mock Encryption Placeholder)
-- In a real scenario, we would use pgsodium or handle encryption at the application layer before inserting.
-- For this MVP, we assume the application handles encryption or we store it raw (but RLS protects it).
