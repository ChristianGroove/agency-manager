
-- ============================================
-- FIX: CONTRACTS STORAGE & SCHEMA REPAIR
-- Date: 2026-01-30
-- Description: Ensures contracts table and storage bucket exist with correct permissions.
-- ============================================

-- 1. Ensure Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure Contracts Table Exists
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL, -- FK added later to avoid order issues if table exists
    client_id UUID,
    lead_id UUID,
    number VARCHAR(50) UNIQUE,
    title TEXT,
    content JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'void', 'expired')),
    pdf_url TEXT,
    vault_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Safely add FK if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'contracts_organization_id_fkey') THEN
        ALTER TABLE public.contracts ADD CONSTRAINT contracts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'contracts_client_id_fkey') THEN
        ALTER TABLE public.contracts ADD CONSTRAINT contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. STORAGE: Create Secure 'contracts' Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 4. STORAGE POLICIES (Drop first to ensure clean state)
DROP POLICY IF EXISTS "Authenticated users can upload contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can only access their organization's contracts" ON storage.objects;

-- Re-create policies
CREATE POLICY "Authenticated users can uploads contracts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contracts' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contracts' AND
  auth.role() = 'authenticated'
);

-- 5. CONTRACTS TABLE RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contracts_org_isolation ON public.contracts;

CREATE POLICY contracts_org_isolation ON public.contracts
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );
