-- ================================================================
-- CRITICAL: SERVICE CATEGORIES ISOLATION - MULTI-TENANT FIX
-- ================================================================
-- Purpose: Isolate service categories by organization + prepare for templates
-- Impact: Each org has its own categories, prevents cross-org category access
-- ================================================================

-- Step 1: Add organization_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_categories' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE service_categories 
        ADD COLUMN organization_id UUID REFERENCES organizations(id);
        
        RAISE NOTICE 'Added organization_id column to service_categories';
    ELSE
        RAISE NOTICE 'organization_id column already exists in service_categories';
    END IF;
END $$;

-- Step 2: Add scope column for template preparation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_categories' AND column_name = 'scope'
    ) THEN
        -- Create enum type for scope if it doesn't exist
        DO $inner$
        BEGIN
            CREATE TYPE category_scope AS ENUM ('tenant', 'system_template');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $inner$;
        
        ALTER TABLE service_categories 
        ADD COLUMN scope category_scope DEFAULT 'tenant';
        
        RAISE NOTICE 'Added scope column to service_categories';
    ELSE
        RAISE NOTICE 'scope column already exists in service_categories';
    END IF;
END $$;

-- Step 3: Migrate ALL existing categories to Pixy Agency
-- CRITICAL: Preserves Pixy's categories before isolation
UPDATE service_categories
SET 
    organization_id = (SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1),
    scope = 'tenant'
WHERE organization_id IS NULL;

-- Verify migration
DO $$
DECLARE
    pixy_id UUID;
    updated_count INTEGER;
BEGIN
    SELECT id INTO pixy_id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1;
    SELECT COUNT(*) INTO updated_count FROM service_categories WHERE organization_id = pixy_id;
    
    RAISE NOTICE 'Migrated % categories to Pixy Agency (ID: %)', updated_count, pixy_id;
END $$;

-- Step 4: Make organization_id required
ALTER TABLE service_categories 
ALTER COLUMN organization_id SET NOT NULL;

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS idx_service_categories_org 
ON service_categories(organization_id);

CREATE INDEX IF NOT EXISTS idx_service_categories_scope 
ON service_categories(scope);

-- Step 6: Enable RLS on service_categories
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Users see only their org categories" ON service_categories;
DROP POLICY IF EXISTS "Users insert categories for their org" ON service_categories;
DROP POLICY IF EXISTS "Users update their org categories" ON service_categories;
DROP POLICY IF EXISTS "Users delete their org categories" ON service_categories;

-- Step 8: Create RLS policies for SELECT
-- Only show tenant-scoped categories from user's organization
-- (Future: system_template scope will be handled differently in cloning processes)
CREATE POLICY "Users see only their org categories" 
ON service_categories
FOR SELECT
USING (
    scope = 'tenant' AND
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Step 9: Create RLS policies for INSERT
CREATE POLICY "Users insert categories for their org" 
ON service_categories
FOR INSERT
WITH CHECK (
    scope = 'tenant' AND
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Step 10: Create RLS policies for UPDATE
CREATE POLICY "Users update their org categories" 
ON service_categories
FOR UPDATE
USING (
    scope = 'tenant' AND
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Step 11: Create RLS policies for DELETE
CREATE POLICY "Users delete their org categories" 
ON service_categories
FOR DELETE
USING (
    scope = 'tenant' AND
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- ================================================================
-- DATA INTEGRITY: Verify services reference valid categories
-- ================================================================

-- Check if any services reference categories from different orgs
SELECT 
    s.id as service_id,
    s.name as service_name,
    s.organization_id as service_org,
    sc.name as category_name,
    sc.organization_id as category_org
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
WHERE s.organization_id IS NOT NULL 
  AND sc.organization_id IS NOT NULL
  AND s.organization_id != sc.organization_id;

-- If the above query returns rows, we have data integrity issues
-- Services should only reference categories from the same organization

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'service_categories';

-- Verify policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'service_categories';

-- Count categories per organization
SELECT 
    o.name as organization_name,
    COUNT(sc.id) as category_count,
    STRING_AGG(sc.name, ', ' ORDER BY sc.name) as categories
FROM service_categories sc
JOIN organizations o ON sc.organization_id = o.id
GROUP BY o.name
ORDER BY category_count DESC;

-- ================================================================
-- EXPECTED RESULTS
-- ================================================================
-- After running this migration:
-- 1. All existing categories belong to Pixy Agency (scope = 'tenant')
-- 2. RLS is enabled on service_categories
-- 3. Users can only see/modify their organization's categories
-- 4. Cross-org category access is BLOCKED
-- 5. Structure ready for system_template scope (future use)
-- ================================================================
