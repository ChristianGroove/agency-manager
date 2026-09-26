-- Migration: 20260926000001_create_user_oauth_connections.sql
-- Description: Create user_oauth_connections table for individual OAuth credentials (Google Meet/Calendar) and add external meeting tracking columns to task_items

-- 1. Create user_oauth_connections table
CREATE TABLE IF NOT EXISTS public.user_oauth_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google')),
    account_email TEXT NOT NULL,
    account_name TEXT,
    account_avatar_url TEXT,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_oauth_connections_org_user_provider_key UNIQUE (organization_id, user_id, provider)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_user_oauth_connections_org_user 
    ON public.user_oauth_connections(organization_id, user_id, provider);

-- 3. RLS
ALTER TABLE public.user_oauth_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_oauth_connections_manage_own ON public.user_oauth_connections;
CREATE POLICY user_oauth_connections_manage_own ON public.user_oauth_connections
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 4. Add external reference columns to task_items
ALTER TABLE public.task_items
    ADD COLUMN IF NOT EXISTS external_meeting_id TEXT,
    ADD COLUMN IF NOT EXISTS external_calendar_event_id TEXT;
