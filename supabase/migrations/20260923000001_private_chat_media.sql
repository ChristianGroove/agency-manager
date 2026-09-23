-- New chat media is private. Historical public attachment URLs remain readable
-- until those objects are migrated separately.
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media-private', 'chat-media-private', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "chat_media_member_upload" ON storage.objects;
CREATE POLICY "chat_media_member_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'chat-media-private'
    AND EXISTS (
        SELECT 1
        FROM public.conversations c
        JOIN public.organization_members om ON om.organization_id = c.organization_id
        WHERE c.organization_id::text = (storage.foldername(name))[1]
          AND c.id::text = (storage.foldername(name))[2]
          AND om.user_id = auth.uid()
          AND om.deleted_at IS NULL
    )
);
