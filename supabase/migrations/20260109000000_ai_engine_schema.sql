-- AI Providers Catalog (Global)
CREATE TABLE public.ai_providers (
    id text PRIMARY KEY, -- e.g. 'openai', 'anthropic'
    name text NOT NULL,
    type text NOT NULL, -- 'llm', 'embedding', 'vision'
    capabilities jsonb DEFAULT '{}'::jsonb, -- e.g. { "stream": true, "function_calling": true }
    base_url text,
    models jsonb DEFAULT '[]'::jsonb, -- Supported models e.g. ["gpt-4", "gpt-3.5-turbo"]
    logo_url text,
    created_at timestamptz DEFAULT now()
);

-- Seed initial providers
INSERT INTO public.ai_providers (id, name, type, capabilities, base_url, models) VALUES
(
    'openai', 
    'OpenAI', 
    'llm', 
    '{"stream": true, "tools": true, "json_mode": true}'::jsonb, 
    'https://api.openai.com/v1', 
    '["gpt-4-turbo", "gpt-4o", "gpt-3.5-turbo"]'::jsonb
),
(
    'anthropic', 
    'Anthropic', 
    'llm', 
    '{"stream": true, "tools": true, "json_mode": false}'::jsonb, 
    'https://api.anthropic.com/v1', 
    '["claude-3-5-sonnet-20240620", "claude-3-opus-20240229"]'::jsonb
);

-- AI Credentials (Tenant Specific, Encrypted)
CREATE TABLE public.ai_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    provider_id text NOT NULL REFERENCES public.ai_providers(id),
    
    -- Encrypted API Key (Base64 string of the encrypted buffer)
    api_key_encrypted text NOT NULL,
    
    -- Routing Logic
    priority int DEFAULT 1, -- Lower is higher priority (1 = Primary, 2 = Fallback)
    
    -- Quota Management
    monthly_limit_credits numeric, -- Optional cost limit
    used_credits_current_month numeric DEFAULT 0,
    
    status text DEFAULT 'active', -- 'active', 'exhausted', 'disabled'
    exhausted_until timestamptz, -- If rate limited, pause until this time
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT unique_prio_per_org_provider UNIQUE (organization_id, provider_id, priority)
);

-- RLS Policies

-- Public: Everyone can read providers
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read providers" ON public.ai_providers FOR SELECT USING (true);

-- Secured: Credentials
ALTER TABLE public.ai_credentials ENABLE ROW LEVEL SECURITY;

-- Only organization admins/owners can manage credentials
CREATE POLICY "Org Admins can manage credentials"
    ON public.ai_credentials
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Usage Logs (Optional but recommended for governance)
CREATE TABLE public.ai_usage_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    credential_id uuid REFERENCES public.ai_credentials(id) ON DELETE SET NULL,
    provider_id text NOT NULL,
    model text NOT NULL,
    
    task_type text NOT NULL, -- e.g. 'summarize', 'reply'
    input_tokens int DEFAULT 0,
    output_tokens int DEFAULT 0,
    cost_estimated numeric(10, 6) DEFAULT 0,
    
    status text DEFAULT 'success', -- 'success', 'failed'
    error_message text,
    
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View usage logs" ON public.ai_usage_logs
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );
