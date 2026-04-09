-- MIGRATION: 20260118030000_secure_storage_policies.sql
-- FIX: Secure Storage Buckets (chat-attachments)
-- OBJECTIVE: Restrict access to files based on Conversation -> Organization -> Member chain.

-- 1. Drop Insecure Policies (Allowing generic authenticated access)
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;

-- 2. Create Secure SELECT Policy
-- Logic: (storage.foldername(name))[1] is the Conversation ID.
-- We check if that conversation belongs to an organization the user is a member of.
CREATE POLICY "secure_view_chat_attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  auth.role() = 'authenticated' AND
  (
    EXISTS (
        SELECT 1 
        FROM conversations c
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE 
            c.id::text = (storage.foldername(name))[1] 
            AND om.user_id = auth.uid()
    )
    OR
    -- Allow admins (Service Role) to bypass implicitly, but RLS applies to auth.
    -- Loophole for "Public" files? No, chat attachments are private.
    -- Allow Access if user is the Sender? Not needed, organization membership is the scope.
    1=0
  )
);

-- 3. Create Secure INSERT Policy
-- Logic: Users can only upload to folders (Conversations) they have access to.
CREATE POLICY "secure_upload_chat_attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.role() = 'authenticated' AND
  EXISTS (
      SELECT 1 
      FROM conversations c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE 
          c.id::text = (storage.foldername(name))[1] 
          AND om.user_id = auth.uid()
  )
);

-- 4. Create Secure DELETE Policy
-- Logic: Users can delete files if they have organization access (usually just admins/agents).
CREATE POLICY "secure_delete_chat_attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' AND
  auth.role() = 'authenticated' AND
  EXISTS (
      SELECT 1 
      FROM conversations c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE 
          c.id::text = (storage.foldername(name))[1] 
          AND om.user_id = auth.uid()
  )
);
