-- ============================================
-- SECURITY FIX: Saved Replies RLS
-- Date: 2026-01-08
-- Phase: 3 (Audit Findings)
-- ============================================

-- ISSUE: saved_replies table uses USING (true) for all operations
-- allowing cross-tenant read/write access.

-- 1. Drop insecure policies
DROP POLICY IF EXISTS "Allow read for authenticated" ON "public"."saved_replies";
DROP POLICY IF EXISTS "Allow insert for authenticated" ON "public"."saved_replies";
DROP POLICY IF EXISTS "Allow update for authenticated" ON "public"."saved_replies";
DROP POLICY IF EXISTS "Allow delete for authenticated" ON "public"."saved_replies";

-- 2. Create SECURE policies
CREATE POLICY "saved_replies_select_by_org"
ON "public"."saved_replies"
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "saved_replies_insert_by_org"
ON "public"."saved_replies"
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "saved_replies_update_by_org"
ON "public"."saved_replies"
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "saved_replies_delete_by_org"
ON "public"."saved_replies"
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
