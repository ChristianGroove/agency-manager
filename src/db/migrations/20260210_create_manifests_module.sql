
-- MANAGED BY ANTIGRAVITY
-- Module: Manifiestos IMEI
-- Description: Schema for storing PDF manifests and their indexed IMEIs

-- 1. Create Manifest Documents Table
CREATE TABLE IF NOT EXISTS manifest_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT DEFAULT 'application/pdf',
    status TEXT DEFAULT 'processed', -- 'processing', 'processed', 'error'
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE manifest_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Access only own organization's documents
CREATE POLICY "Access own organization manifests" ON manifest_documents
    FOR ALL
    USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1))
    WITH CHECK (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

-- 2. Create IMEI Index Table
CREATE TABLE IF NOT EXISTS manifest_imeis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES manifest_documents(id) ON DELETE CASCADE,
    imei TEXT NOT NULL, -- The 15-digit code
    page_number INTEGER NOT NULL, -- Page where it was found
    
    -- Optional: Store coordinates for highlighting if we want to be fancy later
    -- x_rel FLOAT, y_rel FLOAT, width_rel FLOAT, height_rel FLOAT 
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast searching
CREATE INDEX IF NOT EXISTS idx_manifest_imeis_imei ON manifest_imeis(imei);
CREATE INDEX IF NOT EXISTS idx_manifest_imeis_org ON manifest_imeis(organization_id);

-- Enable RLS
ALTER TABLE manifest_imeis ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Access own organization imeis" ON manifest_imeis
    FOR ALL
    USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

-- 3. Storage Bucket Setup (Idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('manifests', 'manifests', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Allow authenticated uploads to 'manifests' bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'manifests' );

CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'manifests' );
