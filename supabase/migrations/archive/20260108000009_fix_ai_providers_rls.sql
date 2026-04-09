
-- Enable RLS (if not already)
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users" ON ai_providers
FOR SELECT
TO authenticated
USING (true);

-- Allow read access to anon (optional, but safe for public provider list)
CREATE POLICY "Allow read access for anon" ON ai_providers
FOR SELECT
TO anon
USING (true);
