-- Migration: Create 'branding' storage bucket
-- Date: 2025-12-30

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'branding', 
    'branding', 
    true, 
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts during re-runs
DROP POLICY IF EXISTS "Public Branding Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Branding Upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own branding assets" ON storage.objects;

-- 3. Set up RLS Policies

-- Allow public read access to all files in the branding bucket
CREATE POLICY "Public Branding Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'branding' );

-- Allow authenticated users (Admins/Tenants) to upload files
CREATE POLICY "Authenticated Branding Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'branding' );

-- Allow users to update their own uploads (optional, but good for management)
CREATE POLICY "Users can update their own branding assets"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'branding' AND owner = auth.uid() );

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own branding assets"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'branding' AND owner = auth.uid() );
