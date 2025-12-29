-- EMAIL SYSTEM ENHANCEMENTS
-- Adds sender configuration columns and creates email audit log table

-- 1. Add email sender configuration to organization_settings
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS email_sender_name TEXT,
ADD COLUMN IF NOT EXISTS email_reply_to TEXT;

COMMENT ON COLUMN public.organization_settings.email_sender_name IS 'Custom name for "From" header (e.g. "My Agency")';
COMMENT ON COLUMN public.organization_settings.email_reply_to IS 'Custom reply-to address';

-- 2. Create email_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable because system emails might be automated
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'queued')),
    provider_id TEXT, -- Resend ID or similar
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for email_logs

-- Users can view logs belonging to their organization
CREATE POLICY "Users can view their org email logs" ON public.email_logs
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users (and system functions via strict flow) can insert logs
CREATE POLICY "Users can insert their org email logs" ON public.email_logs
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- 5. Helper function specifically for Service Role bypass if needed, 
-- but ideally we use supabaseAdmin in backend. 
-- However, for robustness, we index organization_id
CREATE INDEX IF NOT EXISTS idx_email_logs_org_id ON public.email_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at);
