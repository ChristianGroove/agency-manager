-- AI COMMAND CENTER SCHEMA (Phase 9)

-- 1. AI Settings (Configuration)
-- Stores feature flags, limits, and overrides per scope (Global, Tenant, Space)
CREATE TABLE IF NOT EXISTS public.ai_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'tenant', 'space')),
    scope_id TEXT NOT NULL, -- 'system' or tenant_id or space_id
    
    -- Feature Flags
    is_voice_enabled BOOLEAN DEFAULT false,
    is_clawdbot_enabled BOOLEAN DEFAULT false,
    is_personaplex_enabled BOOLEAN DEFAULT false,
    
    -- Quotas & Limits
    daily_token_limit INTEGER DEFAULT 10000,
    monthly_budget_usd DECIMAL(10,2) DEFAULT 0.00,
    
    -- Advanced Configuration (JSON)
    -- e.g. { "voice_provider": "openai", "text_model": "gpt-4" }
    model_overrides JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique index to prevent duplicate configs for same scope
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_settings_scope ON public.ai_settings (scope_type, scope_id);

-- 2. AI Usage Logs (Analytics)
-- Immutable ledger of every AI interaction for auditing and billing
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id), -- Tenant context
    space_id TEXT,                                            -- Space context (e.g., 's1')
    user_id UUID REFERENCES auth.users(id),                   -- Who did it
    
    interaction_type TEXT NOT NULL, -- 'voice_command', 'chat_text', 'code_generation'
    model_id TEXT NOT NULL,         -- 'personaplex-v1', 'clawdbot-v1'
    
    -- Consumption Metrics
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6) DEFAULT 0,
    
    -- Result Status
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'rate_limited')),
    error_message TEXT, -- Info if failed
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb -- Extra tracing info
);

-- Indexes for fast analytics dashboarding
CREATE INDEX IF NOT EXISTS idx_ai_logs_org_time ON public.ai_usage_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_time ON public.ai_usage_logs (user_id, created_at DESC);

-- 3. RLS Policies (Security)
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view/edit all settings
-- (Assuming public.is_admin() or similar function exists, otherwise relying on service_role for now)
CREATE POLICY "Admins can manage AI settings" ON public.ai_settings
    FOR ALL
    USING ( auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'is_super_admin' = 'true') );

-- Users can view logs of their own organization
CREATE POLICY "Users view own org logs" ON public.ai_usage_logs
    FOR SELECT
    USING ( organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

-- SERVICE ROLE (Backend) has full access (Implicit in Supabase)
