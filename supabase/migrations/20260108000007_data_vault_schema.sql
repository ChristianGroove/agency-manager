-- ============================================
-- Data Vault Application: Tenant Snapshots
-- Date: 2026-01-08
-- ============================================

-- 1. System Modules Registry
-- Defines which parts of the system are "backup-able"
CREATE TABLE IF NOT EXISTS public.system_modules_registry (
    key text PRIMARY KEY,
    name text NOT NULL,
    description text,
    dependencies text[] DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Seed core modules
INSERT INTO public.system_modules_registry (key, name, description, dependencies) VALUES
('crm', 'CRM Core', 'Leads, Pipelines, Customers', '{}'),
('messaging', 'Messaging System', 'Conversations, Messages, Templates', '{crm}'),
('automation', 'Workflows', 'Automations and Triggers', '{messaging,crm}'),
('billing', 'Billing Engine', 'Invoices, Subscriptions', '{crm}')
ON CONFLICT (key) DO NOTHING;

-- 2. Data Snapshots Log
-- Tracks the physical files in the vault
CREATE TYPE snapshot_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'restoring', 'archived');

CREATE TABLE IF NOT EXISTS public.data_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    created_by uuid REFERENCES auth.users(id),
    name text NOT NULL, -- User friendly name e.g. "Pre-Migration Backup"
    description text,
    status snapshot_status DEFAULT 'pending',
    
    -- Storage details
    storage_path text, -- Path in bucket: {org_id}/{id}.json.gz
    file_size_bytes bigint,
    checksum text, -- SHA-256 for integrity verify
    
    -- Content details
    included_modules text[],
    metadata jsonb DEFAULT '{}'::jsonb, -- Version info, stats
    
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- RLS for Snapshots Table
ALTER TABLE public.data_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own snapshots"
    ON public.data_snapshots
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Owners can create snapshots"
    ON public.data_snapshots
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner')));

-- 3. Secure Storage Bucket
-- We try to insert. If it exists, we skip (idempotent).
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'vault-backups', 
    'vault-backups', 
    false, -- PRIVATE BUCKET
    false,
    104857600, -- 100MB Limit (starts small, scalable)
    '{application/json, application/gzip}'
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 104857600;

-- RLS for Storage Objects (The Vault Door)
-- Only allow access to files in the folder matching the user's organization_id

CREATE POLICY "Vault Access: Owners Read/Write"
ON storage.objects
FOR ALL
USING (
    bucket_id = 'vault-backups' 
    AND (auth.role() = 'authenticated')
    AND (
        -- User must be owner/admin of the organization matching the folder name
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND organization_id::text = (storage.foldername(name))[1]
        )
    )
);
