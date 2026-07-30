-- ============================================
-- FIX PERMISSIVE RLS POLICIES FOR RESTO SPACE
-- ============================================

-- 1. Drop permissive public policies
DROP POLICY IF EXISTS "Allow public read access to table sessions" ON resto_table_sessions;
DROP POLICY IF EXISTS "Allow public insert to table sessions" ON resto_table_sessions;
DROP POLICY IF EXISTS "Allow public read access to resto orders" ON resto_orders;

-- 2. Ensure RLS is enabled
ALTER TABLE resto_table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_orders ENABLE ROW LEVEL SECURITY;

-- 3. Tenant isolation for authenticated organization members
CREATE POLICY "Tenant members select table sessions"
ON resto_table_sessions
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Tenant members write table sessions"
ON resto_table_sessions
FOR ALL
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

CREATE POLICY "Tenant members select resto orders"
ON resto_orders
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Tenant members write resto orders"
ON resto_orders
FOR ALL
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

-- Note: Guest portal and staff portal API actions execute via server actions with supabaseAdmin,
-- which safely bypasses RLS with full server-side token/session validation.
