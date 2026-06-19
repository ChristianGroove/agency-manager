-- Fix RLS policies for data_snapshots to handle multiple organization memberships
-- Prevents "more than one row returned by a subquery used as an expression" error

DROP POLICY IF EXISTS "Owners can view own snapshots" ON "public"."data_snapshots";
DROP POLICY IF EXISTS "Owners can create snapshots" ON "public"."data_snapshots";

CREATE POLICY "Owners can view own snapshots" ON "public"."data_snapshots"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = data_snapshots.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Owners can create snapshots" ON "public"."data_snapshots"
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = data_snapshots.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'owner'
  )
);
