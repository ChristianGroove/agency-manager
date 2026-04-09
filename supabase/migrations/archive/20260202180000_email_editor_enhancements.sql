
-- Add content_blocks to email_templates to store JSON editor state
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS content_blocks jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for Agency Assets (Email images, logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-assets', 'agency-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload to agency-assets
CREATE POLICY "Authenticated users can upload agency assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agency-assets' AND
  auth.role() = 'authenticated'
);

-- Policy: Public read access for agency-assets (needed for emails to render image)
CREATE POLICY "Public can view agency assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'agency-assets'
);
