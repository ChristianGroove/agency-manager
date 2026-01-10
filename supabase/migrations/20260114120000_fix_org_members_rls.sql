-- Ensure users can read their own organization membership
DROP POLICY IF EXISTS "Users can view their own membership" ON organization_members;

CREATE POLICY "Users can view their own membership"
ON organization_members FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Also allow reading if they are part of the org (for other members) - usually needed for team lists, 
-- but for this specific "get my org" query, the above is sufficient.
