-- CRITICAL: Verify and Fix RLS Policies on Clients Table

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'clients';

-- 2. View existing policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clients';

-- 3. Enable RLS if not enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies and recreate strict ones
DROP POLICY IF EXISTS "Users can view their organization's clients" ON clients;
DROP POLICY IF EXISTS "Users can create clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can update their organization's clients" ON clients;
DROP POLICY IF EXISTS "Users can delete their organization's clients" ON clients;

-- 5. Create strict SELECT policy
CREATE POLICY "Users can view their organization's clients"
ON clients FOR SELECT
USING (organization_id IN (SELECT get_auth_org_ids()));

-- 6. Create strict INSERT policy  
CREATE POLICY "Users can create clients in their organization"
ON clients FOR INSERT
WITH CHECK (organization_id IN (SELECT get_auth_org_ids()));

-- 7. Create strict UPDATE policy
CREATE POLICY "Users can update their organization's clients"
ON clients FOR UPDATE
USING (organization_id IN (SELECT get_auth_org_ids()))
WITH CHECK (organization_id IN (SELECT get_auth_org_ids()));

-- 8. Create strict DELETE policy
CREATE POLICY "Users can delete their organization's clients"
ON clients FOR DELETE
USING (organization_id IN (SELECT get_auth_org_ids()));

-- 9. Verify policies were created
SELECT policyname, cmd 
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clients'
ORDER BY policyname;

-- 10. Test policy (will fail if user not in organization)
SELECT COUNT(*) as client_count
FROM clients;
