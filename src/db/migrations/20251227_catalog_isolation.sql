-- ================================================================
-- CRITICAL: SERVICE CATALOG ISOLATION - MULTI-TENANT FIX
-- ================================================================
-- Purpose: Add organization_id to service_catalog and enforce RLS
-- Impact: Prevents cross-organization catalog access
-- ================================================================

-- Step 1: Add organization_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_catalog' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE service_catalog 
        ADD COLUMN organization_id UUID REFERENCES organizations(id);
        
        RAISE NOTICE 'Added organization_id column to service_catalog';
    ELSE
        RAISE NOTICE 'organization_id column already exists in service_catalog';
    END IF;
END $$;

-- Step 2: Migrate ALL existing catalog items to Pixy Agency
-- CRITICAL: This preserves Pixy's catalog before enforcing isolation
UPDATE service_catalog
SET organization_id = (
    SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1
)
WHERE organization_id IS NULL;

-- Verify migration
DO $$
DECLARE
    pixy_id UUID;
    updated_count INTEGER;
BEGIN
    SELECT id INTO pixy_id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1;
    SELECT COUNT(*) INTO updated_count FROM service_catalog WHERE organization_id = pixy_id;
    
    RAISE NOTICE 'Migrated % catalog items to Pixy Agency (ID: %)', updated_count, pixy_id;
END $$;

-- Step 3: Make organization_id required
ALTER TABLE service_catalog 
ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_service_catalog_org 
ON service_catalog(organization_id);

-- Step 5: Enable RLS on service_catalog
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Users see only their org catalog" ON service_catalog;
DROP POLICY IF EXISTS "Users insert catalog for their org" ON service_catalog;
DROP POLICY IF EXISTS "Users update their org catalog" ON service_catalog;
DROP POLICY IF EXISTS "Users delete their org catalog" ON service_catalog;

-- Step 7: Create RLS policies for SELECT
CREATE POLICY "Users see only their org catalog" 
ON service_catalog
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Step 8: Create RLS policies for INSERT
CREATE POLICY "Users insert catalog for their org" 
ON service_catalog
FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Step 9: Create RLS policies for UPDATE
CREATE POLICY "Users update their org catalog" 
ON service_catalog
FOR UPDATE
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Step 10: Create RLS policies for DELETE
CREATE POLICY "Users delete their org catalog" 
ON service_catalog
FOR DELETE
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'service_catalog';

-- Verify policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'service_catalog';

-- Count items per organization
SELECT 
    o.name as organization_name,
    COUNT(sc.id) as catalog_items
FROM service_catalog sc
JOIN organizations o ON sc.organization_id = o.id
GROUP BY o.name
ORDER BY catalog_items DESC;
