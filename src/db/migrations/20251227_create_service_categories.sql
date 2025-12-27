-- ================================================================
-- PHASE 1: SERVICE CATEGORIES TABLE - MULTI-TENANT ISOLATION
-- ================================================================
-- Purpose: Create database-driven categories to replace hardcoded values
-- Critical: Migrate Pixy's 9 categories to preserve their catalog
-- ================================================================

-- Step 1: Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    icon TEXT DEFAULT 'Folder',  -- Lucide React icon name
    color TEXT DEFAULT 'gray',   -- Color name for Tailwind
    scope TEXT DEFAULT 'tenant' CHECK (scope IN ('tenant', 'system', 'template')),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_categories_org 
ON service_categories(organization_id);

CREATE INDEX IF NOT EXISTS idx_service_categories_scope 
ON service_categories(scope);

CREATE INDEX IF NOT EXISTS idx_service_categories_order 
ON service_categories(organization_id, order_index);

-- Step 3: Enable RLS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Users see only their org categories" ON service_categories;
DROP POLICY IF EXISTS "Users insert categories for their org" ON service_categories;
DROP POLICY IF EXISTS "Users update their org categories" ON service_categories;
DROP POLICY IF EXISTS "Users delete their org categories" ON service_categories;

-- Step 5: Create RLS policies
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
-- CRITICAL: MIGRATE PIXY'S HARDCODED CATEGORIES
-- ================================================================
-- These categories are currently hardcoded in service-catalog-selector.tsx
-- We migrate them to database and assign to Pixy Agency
-- ================================================================

INSERT INTO service_categories (organization_id, name, slug, icon, color, scope, order_index)
SELECT 
    (SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1) as organization_id,
    name,
    slug,
    icon,
    color,
    'tenant' as scope,
    order_index
FROM (VALUES
    ('Infraestructura & Suscripciones', 'infraestructura-suscripciones', 'Server', 'blue', 1),
    ('Branding & Identidad', 'branding-identidad', 'Palette', 'purple', 2),
    ('UX / UI & Producto Digital', 'ux-ui-producto-digital', 'Monitor', 'pink', 3),
    ('Web & Ecommerce', 'web-ecommerce', 'Globe', 'indigo', 4),
    ('Marketing & Growth', 'marketing-growth', 'TrendingUp', 'green', 5),
    ('Social Media & Contenido', 'social-media-contenido', 'MessageCircle', 'orange', 6),
    ('Diseño como Servicio (DaaS)', 'diseno-como-servicio', 'Briefcase', 'cyan', 7),
    ('Consultoría & Especialidades', 'consultoria-especialidades', 'Lightbulb', 'amber', 8),
    ('Servicios Flexibles / A Medida', 'servicios-flexibles', 'Puzzle', 'gray', 9)
) AS categories(name, slug, icon, color, order_index)
ON CONFLICT (organization_id, slug) DO NOTHING;

-- Verify migration
DO $$
DECLARE
    pixy_id UUID;
    category_count INTEGER;
BEGIN
    SELECT id INTO pixy_id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1;
    SELECT COUNT(*) INTO category_count FROM service_categories WHERE organization_id = pixy_id;
    
    RAISE NOTICE '✅ Migrated % categories to Pixy Agency (ID: %)', category_count, pixy_id;
END $$;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- 1. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'service_categories'
ORDER BY ordinal_position;

-- 2. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'service_categories';

-- 3. Verify policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'service_categories'
ORDER BY policyname;

-- 4. Count categories per organization
SELECT 
    o.name as organization_name,
    COUNT(sc.id) as category_count,
    STRING_AGG(sc.name, ', ' ORDER BY sc.order_index) as categories
FROM service_categories sc
JOIN organizations o ON sc.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY category_count DESC;

-- 5. Show Pixy's categories
SELECT 
    name,
    slug,
    icon,
    color,
    order_index
FROM service_categories
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1)
ORDER BY order_index;

-- ================================================================
-- EXPECTED RESULTS
-- ================================================================
-- After running this migration:
-- 1. service_categories table created with RLS ✅
-- 2. Pixy Agency has 9 categories migrated ✅
-- 3. Other organizations have 0 categories ✅
-- 4. Each org can only see their own categories (RLS) ✅
-- 5. Ready for Phase 2 (Server Actions) ✅
-- ================================================================
