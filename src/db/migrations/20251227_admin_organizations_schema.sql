-- Migration: Add administrative columns to organizations table
-- Description: Adds status tracking, billing info, and suspension details for SaaS management
-- Author: Antigravity
-- Date: 2025-12-27

-- 1. Add new columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('active', 'suspended', 'past_due', 'archived')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_reason text,
ADD COLUMN IF NOT EXISTS base_app_slug text DEFAULT 'agency-manager';

-- 2. Create organization_audit_log table
CREATE TABLE IF NOT EXISTS public.organization_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    action text NOT NULL,
    performed_by uuid REFERENCES auth.users(id),
    details jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on audit log
ALTER TABLE public.organization_audit_log ENABLE ROW LEVEL SECURITY;

-- 4. Create policy for super_admin to view audit logs
CREATE POLICY "Super admins can view audit logs" ON public.organization_audit_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.platform_role = 'super_admin'
        )
    );

-- 5. Create policy for super_admin to insert audit logs
CREATE POLICY "Super admins can insert audit logs" ON public.organization_audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.platform_role = 'super_admin'
        )
    );

-- 6. Index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON public.organization_audit_log(organization_id);
