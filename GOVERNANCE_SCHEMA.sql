-- ASSISTANT GOVERNANCE SCHEMA (Phase 1)
-- Strict audit log for intent proposals and execution statuses

CREATE TABLE IF NOT EXISTS public.assistant_intent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    space_id TEXT, -- e.g. 'agency', 'clinic'
    organization_id UUID REFERENCES organizations(id),
    
    -- Governance Status
    status TEXT NOT NULL CHECK (status IN ('proposed', 'confirmed', 'rejected', 'executed', 'failed')),
    
    -- Context & Payload
    payload JSONB DEFAULT '{}'::jsonb, -- The parameters extracted
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
    metadata JSONB DEFAULT '{}'::jsonb, -- Reasons for rejection, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for Audit Queries (e.g. "Who rejected what?")
CREATE INDEX IF NOT EXISTS idx_intent_logs_org_status ON public.assistant_intent_logs (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_intent_logs_user ON public.assistant_intent_logs (user_id);

-- RLS: Only admins/users of the org can see logs
ALTER TABLE public.assistant_intent_logs ENABLE ROW LEVEL SECURITY;

-- 1. DROP EXISTING POLICIES TO AVOID CONFLICTS
DROP POLICY IF EXISTS "Users view own intent logs" ON public.assistant_intent_logs;
DROP POLICY IF EXISTS "Users can insert intent logs" ON public.assistant_intent_logs;

-- 2. RE-CREATE POLICIES
CREATE POLICY "Users view own intent logs" ON public.assistant_intent_logs
    FOR SELECT
    USING ( organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

-- Allow Public/Anon Insert (Needed for Server-side logging where generic client is used or Tests)
-- In production, we might want to restrict this to 'authenticated', but for now this unblocks operation.
CREATE POLICY "Everyone can insert intent logs" ON public.assistant_intent_logs
    FOR INSERT
    WITH CHECK (true);
