-- Migration: Enable authenticated users to insert leads and manage conversations
-- Created manually to fix Direct Chat RLS issues

-- 1. Policies for 'leads'
-- Ensure authenticated users can INSERT leads if they belong to the organization
DROP POLICY IF EXISTS "Enable insert for authenticated users within organization" ON leads;

CREATE POLICY "Enable insert for authenticated users within organization" 
ON leads FOR INSERT 
TO authenticated 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Ensure authenticated users can SELECT leads if they belong to the organization
-- (This likely already exists, but reinforcing)
DROP POLICY IF EXISTS "Enable select for authenticated users within organization" ON leads;

CREATE POLICY "Enable select for authenticated users within organization" 
ON leads FOR SELECT 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);


-- 2. Policies for 'conversations'
-- Ensure authenticated users can INSERT conversations if they belong to the organization
DROP POLICY IF EXISTS "Enable insert for authenticated users within organization" ON conversations;

CREATE POLICY "Enable insert for authenticated users within organization" 
ON conversations FOR INSERT 
TO authenticated 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Ensure authenticated users can SELECT conversations
DROP POLICY IF EXISTS "Enable select for authenticated users within organization" ON conversations;

CREATE POLICY "Enable select for authenticated users within organization" 
ON conversations FOR SELECT 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- 3. Clients (just in case)
DROP POLICY IF EXISTS "Enable insert for authenticated users within organization" ON clients;

CREATE POLICY "Enable insert for authenticated users within organization" 
ON clients FOR INSERT 
TO authenticated 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);
