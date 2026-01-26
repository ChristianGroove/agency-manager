
-- Update RLS for LEADS table to allow Org Members to view
-- Problem: Current policy might be restricting to 'owner' (user_id) only.
-- Fix: Allow SELECT if user is member of organization_id.

DROP POLICY IF EXISTS "Enable read access for organization members" ON "public"."leads";
DROP POLICY IF EXISTS "Enable insert for organization members" ON "public"."leads";
DROP POLICY IF EXISTS "Enable update for organization members" ON "public"."leads";
DROP POLICY IF EXISTS "Enable delete for organization members" ON "public"."leads";

CREATE POLICY "Enable read access for organization members" ON "public"."leads"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (organization_id IN (
    SELECT organization_members.organization_id 
    FROM organization_members 
    WHERE organization_members.user_id = auth.uid()
  ))
);

CREATE POLICY "Enable insert for organization members" ON "public"."leads"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  (organization_id IN (
    SELECT organization_members.organization_id 
    FROM organization_members 
    WHERE organization_members.user_id = auth.uid()
  ))
);

CREATE POLICY "Enable update for organization members" ON "public"."leads"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  (organization_id IN (
    SELECT organization_members.organization_id 
    FROM organization_members 
    WHERE organization_members.user_id = auth.uid()
  ))
);

-- Also fix CRM Tasks just in case
DROP POLICY IF EXISTS "Enable read access for organization members" ON "public"."crm_tasks";
CREATE POLICY "Enable read access for organization members" ON "public"."crm_tasks"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (organization_id IN (
    SELECT organization_members.organization_id 
    FROM organization_members 
    WHERE organization_members.user_id = auth.uid()
  ))
);
