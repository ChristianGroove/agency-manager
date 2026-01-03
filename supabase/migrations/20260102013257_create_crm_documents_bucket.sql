-- Migration: Create 'crm-documents' storage bucket
-- Date: 2026-01-02

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'crm-documents', 
    'crm-documents', 
    true, -- Public for now for easier access, but RLS on table restricts visibility of links
    10485760, -- 10MB limit
    NULL -- Allow all types (or restrict to common docs if needed)
)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated CRM Documents Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated CRM Documents Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated CRM Documents Delete" ON storage.objects;

-- 3. Set up RLS Policies

-- Allow authenticated users to read files (Organization check handles logical access)
CREATE POLICY "Authenticated CRM Documents Read Access"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'crm-documents' );

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated CRM Documents Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'crm-documents' );

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated CRM Documents Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'crm-documents' );
