-- ==============================================================================
-- MIGRATION: 20260816000000_universal_catalog_portal.sql
-- PURPOSE: Universal Multi-Industry Catalog & Premium Storefront Portal (M1)
-- AUTHOR: Pixy Architecture & Data Model Team
-- IDEMPOTENT: Safe to run multiple times without data loss or constraint conflicts
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS ON public.service_catalog
-- ------------------------------------------------------------------------------

-- 1.1 Multi-Photo Gallery & Media
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS featured_badge TEXT,
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- 1.2 Universal Classification & Inventory Management
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'service',
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_backorders BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(15, 2);

-- 1.3 Dynamic Variants & Attribute Configurations
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS variants_config JSONB DEFAULT '{"attributes": []}'::jsonb;

-- 1.4 Add-ons, Specifications, SEO & Details
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS add_ons JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS addon_groups JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS specs_tabs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS spec_tabs JSONB DEFAULT '{"description": true, "features": true, "deliverables": true, "policies": true}'::jsonb,
ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS physical_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS digital_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS service_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS subscription_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS classification_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 1.5 Safely Update Check Constraints on service_catalog
DO $$
BEGIN
    -- Drop existing type check constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.service_catalog'::regclass 
        AND conname = 'service_catalog_type_check'
    ) THEN
        ALTER TABLE public.service_catalog DROP CONSTRAINT service_catalog_type_check;
    END IF;
    
    ALTER TABLE public.service_catalog
    ADD CONSTRAINT service_catalog_type_check 
    CHECK (type = ANY (ARRAY['recurring'::text, 'one_off'::text, 'product'::text, 'physical'::text, 'digital'::text, 'service'::text, 'subscription'::text]));

    -- Drop existing classification check constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.service_catalog'::regclass 
        AND conname = 'service_catalog_classification_check'
    ) THEN
        ALTER TABLE public.service_catalog DROP CONSTRAINT service_catalog_classification_check;
    END IF;

    ALTER TABLE public.service_catalog
    ADD CONSTRAINT service_catalog_classification_check 
    CHECK (classification = ANY (ARRAY['physical'::text, 'digital'::text, 'service'::text, 'subscription'::text]));
END $$;

-- 1.6 Data Backfills for Legacy Rows
UPDATE public.service_catalog
SET classification = CASE
    WHEN type = 'product' THEN 'physical'
    WHEN type = 'recurring' THEN 'subscription'
    ELSE 'service'
END
WHERE classification IS NULL OR classification = 'service';

-- Backfill gallery_images and images from image_url if empty
UPDATE public.service_catalog
SET 
    gallery_images = CASE 
        WHEN (gallery_images IS NULL OR gallery_images = '[]'::jsonb) AND image_url IS NOT NULL THEN
            jsonb_build_array(
                jsonb_build_object(
                    'id', gen_random_uuid()::text,
                    'url', image_url,
                    'alt', name,
                    'is_cover', true,
                    'order_index', 0
                )
            )
        ELSE COALESCE(gallery_images, '[]'::jsonb)
    END,
    images = CASE 
        WHEN (images IS NULL OR images = '[]'::jsonb) AND image_url IS NOT NULL THEN
            jsonb_build_array(
                jsonb_build_object(
                    'id', gen_random_uuid()::text,
                    'url', image_url,
                    'alt', name,
                    'is_cover', true,
                    'order_index', 0
                )
            )
        ELSE COALESCE(images, '[]'::jsonb)
    END
WHERE image_url IS NOT NULL;


-- ------------------------------------------------------------------------------
-- 2. EXTENSIONS ON public.service_categories
-- ------------------------------------------------------------------------------

ALTER TABLE public.service_categories
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Folder'::text,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'gray'::text,
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'tenant'::text,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.service_categories'::regclass 
        AND conname = 'service_categories_scope_check'
    ) THEN
        ALTER TABLE public.service_categories
        ADD CONSTRAINT service_categories_scope_check 
        CHECK (scope = ANY (ARRAY['tenant'::text, 'system'::text, 'template'::text]));
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 3. EXTENSIONS ON public.organization_settings (PORTAL THEME CONFIG)
-- ------------------------------------------------------------------------------

ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS portal_theme_config JSONB DEFAULT '{}'::jsonb;

-- Seed default portal customization configuration where empty
UPDATE public.organization_settings
SET portal_theme_config = jsonb_build_object(
    'theme', 'modern',
    'primary_color', COALESCE(portal_primary_color, '#4F46E5'),
    'secondary_color', COALESCE(portal_secondary_color, '#EC4899'),
    'accent_color', '#10B981',
    'hero', jsonb_build_object(
        'enabled', true,
        'title', 'Descubre Nuestras Soluciones',
        'subtitle', 'Calidad superior, innovación y servicio personalizado.',
        'cta_text', 'Explorar Catálogo',
        'cta_url', '#catalog',
        'bg_gradient', 'from-indigo-900 via-slate-900 to-black',
        'badge_text', 'Portafolio 2026'
    ),
    'navigation_style', 'pills',
    'card_layout', 'grid',
    'enable_search', true,
    'enable_whatsapp_checkout', true,
    'enable_quote_request', true,
    'enable_qr_code', true,
    'faq', '[]'::jsonb,
    'testimonials', '[]'::jsonb,
    'business_hours', jsonb_build_object(
        'monday_friday', '08:00 - 18:00',
        'saturday', '09:00 - 14:00',
        'sunday', 'Cerrado'
    )
)
WHERE portal_theme_config IS NULL OR portal_theme_config = '{}'::jsonb;


-- ------------------------------------------------------------------------------
-- 4. NEW TABLES FOR UNIVERSAL CATALOG ENGINE
-- ------------------------------------------------------------------------------

-- 4.1 Reusable Attribute Groups (public.service_catalog_attributes)
CREATE TABLE IF NOT EXISTS public.service_catalog_attributes (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                                 -- e.g. "Color", "Talla", "Material", "Tipo de Licencia"
    slug TEXT NOT NULL,                                 -- e.g. "color", "size", "material", "license_tier"
    display_type TEXT DEFAULT 'pill' NOT NULL,          -- 'color_swatch', 'image_swatch', 'pill', 'select', 'radio'
    type TEXT DEFAULT 'pills' NOT NULL,                 -- alias for backwards compatibility
    options JSONB DEFAULT '[]'::jsonb NOT NULL,         -- [{ id, label, value, hex_color, image_url, order_index }]
    order_index INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT service_catalog_attributes_org_slug_key UNIQUE (organization_id, slug)
);

-- 4.2 Product/Service Variants Matrix (public.service_catalog_variants)
CREATE TABLE IF NOT EXISTS public.service_catalog_variants (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    catalog_item_id UUID NOT NULL REFERENCES public.service_catalog(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                                 -- e.g. "Negro / L", "Plan Anual Pro"
    sku TEXT,                                           -- e.g. "TSH-BLK-L"
    barcode TEXT,
    price_override NUMERIC(15, 2) DEFAULT NULL,        -- Absolute price if set
    price_modifier NUMERIC(15, 2) DEFAULT 0 NOT NULL,   -- Price delta
    price_type TEXT DEFAULT 'fixed' NOT NULL,          -- 'fixed', 'offset', 'percentage'
    inventory_quantity INTEGER DEFAULT 0,
    stock_quantity INTEGER DEFAULT NULL,
    track_inventory BOOLEAN DEFAULT false NOT NULL,
    track_stock BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    order_index INTEGER DEFAULT 0 NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb NOT NULL,      -- e.g. { "Color": "Negro", "Talla": "L" }
    image_url TEXT,                                     -- Dedicated variant image URL
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT service_catalog_variants_price_type_check CHECK (price_type = ANY (ARRAY['fixed'::text, 'offset'::text, 'percentage'::text]))
);

-- 4.3 Add-ons & Upsells Library (public.service_catalog_addons)
CREATE TABLE IF NOT EXISTS public.service_catalog_addons (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                                 -- e.g. "Garantía Extendida", "Empaque de Regalo"
    description TEXT,
    price NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    price_type TEXT DEFAULT 'fixed' NOT NULL,          -- 'fixed', 'percentage', 'per_unit'
    selection_type TEXT DEFAULT 'multiple' NOT NULL,    -- 'single', 'multiple'
    is_required BOOLEAN DEFAULT false NOT NULL,
    min_selections INTEGER DEFAULT 0 NOT NULL,
    max_selections INTEGER DEFAULT 10 NOT NULL,
    max_quantity INTEGER DEFAULT 1 NOT NULL,
    options JSONB DEFAULT '[]'::jsonb NOT NULL,         -- [{ id, name, description, price, is_default, sku_suffix }]
    is_active BOOLEAN DEFAULT true NOT NULL,
    scope TEXT DEFAULT 'item' NOT NULL,                 -- 'global' (all items) or 'item' (linked items)
    order_index INTEGER DEFAULT 0 NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT service_catalog_addons_price_type_check CHECK (price_type = ANY (ARRAY['fixed'::text, 'percentage'::text, 'per_unit'::text])),
    CONSTRAINT service_catalog_addons_selection_type_check CHECK (selection_type = ANY (ARRAY['single'::text, 'multiple'::text])),
    CONSTRAINT service_catalog_addons_scope_check CHECK (scope = ANY (ARRAY['global'::text, 'item'::text]))
);

-- 4.4 Item-to-Addon Junction (public.service_catalog_item_addons)
CREATE TABLE IF NOT EXISTS public.service_catalog_item_addons (
    item_id UUID NOT NULL REFERENCES public.service_catalog(id) ON DELETE CASCADE,
    addon_id UUID NOT NULL REFERENCES public.service_catalog_addons(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0 NOT NULL,
    PRIMARY KEY (item_id, addon_id)
);


-- ------------------------------------------------------------------------------
-- 5. PERFORMANCE & SEARCH INDEXES
-- ------------------------------------------------------------------------------

-- service_catalog indexes
CREATE INDEX IF NOT EXISTS idx_service_catalog_classification ON public.service_catalog USING btree (classification);
CREATE INDEX IF NOT EXISTS idx_service_catalog_sku ON public.service_catalog USING btree (organization_id, sku);
CREATE INDEX IF NOT EXISTS idx_service_catalog_has_variants ON public.service_catalog USING btree (has_variants);
CREATE INDEX IF NOT EXISTS idx_service_catalog_order ON public.service_catalog USING btree (organization_id, order_index);
CREATE INDEX IF NOT EXISTS idx_service_catalog_gallery_images ON public.service_catalog USING gin (gallery_images);
CREATE INDEX IF NOT EXISTS idx_service_catalog_variants ON public.service_catalog USING gin (variants);
CREATE INDEX IF NOT EXISTS idx_service_catalog_badges ON public.service_catalog USING gin (badges);

-- service_categories indexes
CREATE INDEX IF NOT EXISTS idx_service_categories_org ON public.service_categories USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_order ON public.service_categories USING btree (organization_id, order_index);
CREATE INDEX IF NOT EXISTS idx_service_categories_scope ON public.service_categories USING btree (scope);

-- service_catalog_attributes indexes
CREATE INDEX IF NOT EXISTS idx_service_catalog_attributes_org ON public.service_catalog_attributes USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_attributes_order ON public.service_catalog_attributes USING btree (organization_id, order_index);

-- service_catalog_variants indexes
CREATE INDEX IF NOT EXISTS idx_service_catalog_variants_item ON public.service_catalog_variants USING btree (catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_variants_org ON public.service_catalog_variants USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_variants_sku ON public.service_catalog_variants USING btree (organization_id, sku);
CREATE INDEX IF NOT EXISTS idx_service_catalog_variants_order ON public.service_catalog_variants USING btree (catalog_item_id, order_index);

-- service_catalog_addons indexes
CREATE INDEX IF NOT EXISTS idx_service_catalog_addons_org ON public.service_catalog_addons USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_addons_scope ON public.service_catalog_addons USING btree (organization_id, scope);
CREATE INDEX IF NOT EXISTS idx_service_catalog_addons_order ON public.service_catalog_addons USING btree (organization_id, order_index);

-- service_catalog_item_addons indexes
CREATE INDEX IF NOT EXISTS idx_service_catalog_item_addons_item ON public.service_catalog_item_addons USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_item_addons_addon ON public.service_catalog_item_addons USING btree (addon_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_item_addons_order ON public.service_catalog_item_addons USING btree (item_id, order_index);


-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog_item_addons ENABLE ROW LEVEL SECURITY;

-- 6.1 Policies on service_catalog
DROP POLICY IF EXISTS "view_service_catalog" ON public.service_catalog;
CREATE POLICY "view_service_catalog" ON public.service_catalog
FOR SELECT TO authenticated
USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "manage_service_catalog" ON public.service_catalog;
CREATE POLICY "manage_service_catalog" ON public.service_catalog
FOR ALL TO authenticated
USING (organization_id IN (
    SELECT member.organization_id FROM public.organization_members member
    LEFT JOIN public.organization_roles role ON member.role_id = role.id
    WHERE member.user_id = auth.uid()
    AND (
        member.role IN ('owner', 'admin', 'manager')
        OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
    )
))
WITH CHECK (organization_id IN (
    SELECT member.organization_id FROM public.organization_members member
    LEFT JOIN public.organization_roles role ON member.role_id = role.id
    WHERE member.user_id = auth.uid()
    AND (
        member.role IN ('owner', 'admin', 'manager')
        OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
    )
));

DROP POLICY IF EXISTS "Public storefront view visible catalog" ON public.service_catalog;
CREATE POLICY "Public storefront view visible catalog" ON public.service_catalog
FOR SELECT TO anon, authenticated
USING (is_visible_in_portal = true AND deleted_at IS NULL);

-- 6.2 Policies on service_categories
DROP POLICY IF EXISTS "Categories viewable by org members" ON public.service_categories;
CREATE POLICY "Categories viewable by org members" ON public.service_categories
FOR SELECT TO authenticated
USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Categories manageable by org admins" ON public.service_categories;
CREATE POLICY "Categories manageable by org admins" ON public.service_categories
FOR ALL TO authenticated
USING (organization_id IN (
    SELECT member.organization_id FROM public.organization_members member
    LEFT JOIN public.organization_roles role ON member.role_id = role.id
    WHERE member.user_id = auth.uid()
    AND (
        member.role IN ('owner', 'admin', 'manager')
        OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
    )
))
WITH CHECK (organization_id IN (
    SELECT member.organization_id FROM public.organization_members member
    LEFT JOIN public.organization_roles role ON member.role_id = role.id
    WHERE member.user_id = auth.uid()
    AND (
        member.role IN ('owner', 'admin', 'manager')
        OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
    )
));

DROP POLICY IF EXISTS "Public storefront view categories" ON public.service_categories;
CREATE POLICY "Public storefront view categories" ON public.service_categories
FOR SELECT TO anon, authenticated
USING (true);

-- 6.3 Policies on service_catalog_attributes
DROP POLICY IF EXISTS "Attributes viewable by org members" ON public.service_catalog_attributes;
CREATE POLICY "Attributes viewable by org members" ON public.service_catalog_attributes
FOR SELECT TO authenticated
USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Attributes manageable by org admins" ON public.service_catalog_attributes;
CREATE POLICY "Attributes manageable by org admins" ON public.service_catalog_attributes
FOR ALL TO authenticated
USING (organization_id IN (
    SELECT member.organization_id FROM public.organization_members member
    LEFT JOIN public.organization_roles role ON member.role_id = role.id
    WHERE member.user_id = auth.uid()
    AND (
        member.role IN ('owner', 'admin', 'manager')
        OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
    )
))
WITH CHECK (organization_id IN (
    SELECT member.organization_id FROM public.organization_members member
    LEFT JOIN public.organization_roles role ON member.role_id = role.id
    WHERE member.user_id = auth.uid()
    AND (
        member.role IN ('owner', 'admin', 'manager')
        OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
    )
));

DROP POLICY IF EXISTS "Public storefront view attributes" ON public.service_catalog_attributes;
CREATE POLICY "Public storefront view attributes" ON public.service_catalog_attributes
FOR SELECT TO anon, authenticated
USING (is_active = true);

-- 6.4 Policies on service_catalog_variants
DROP POLICY IF EXISTS "Variants viewable by org members" ON public.service_catalog_variants;
CREATE POLICY "Variants viewable by org members" ON public.service_catalog_variants
FOR SELECT TO authenticated
USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Variants manageable by org admins" ON public.service_catalog_variants;
CREATE POLICY "Variants manageable by org admins" ON public.service_catalog_variants
FOR ALL TO authenticated
USING (organization_id IN (
    SELECT member.organization_id FROM public.organization_members member
    LEFT JOIN public.organization_roles role ON member.role_id = role.id
    WHERE member.user_id = auth.uid()
    AND (
        member.role IN ('owner', 'admin', 'manager')
        OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
    )
))
WITH CHECK (organization_id IN (
    SELECT member.organization_id FROM public.organization_members member
    LEFT JOIN public.organization_roles role ON member.role_id = role.id
    WHERE member.user_id = auth.uid()
    AND (
        member.role IN ('owner', 'admin', 'manager')
        OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
    )
));

DROP POLICY IF EXISTS "Public storefront view variants" ON public.service_catalog_variants;
CREATE POLICY "Public storefront view variants" ON public.service_catalog_variants
FOR SELECT TO anon, authenticated
USING (is_active = true);

-- 6.5 Policies on service_catalog_addons
DROP POLICY IF EXISTS "Addons viewable by org members" ON public.service_catalog_addons;
CREATE POLICY "Addons viewable by org members" ON public.service_catalog_addons
FOR SELECT TO authenticated
USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Addons manageable by org admins" ON public.service_catalog_addons;
CREATE POLICY "Addons manageable by org admins" ON public.service_catalog_addons
FOR ALL TO authenticated
USING (organization_id IN (
    SELECT member.organization_id FROM public.organization_members member
    LEFT JOIN public.organization_roles role ON member.role_id = role.id
    WHERE member.user_id = auth.uid()
    AND (
        member.role IN ('owner', 'admin', 'manager')
        OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
    )
))
WITH CHECK (organization_id IN (
    SELECT member.organization_id FROM public.organization_members member
    LEFT JOIN public.organization_roles role ON member.role_id = role.id
    WHERE member.user_id = auth.uid()
    AND (
        member.role IN ('owner', 'admin', 'manager')
        OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
    )
));

DROP POLICY IF EXISTS "Public storefront view addons" ON public.service_catalog_addons;
CREATE POLICY "Public storefront view addons" ON public.service_catalog_addons
FOR SELECT TO anon, authenticated
USING (is_active = true);

-- 6.6 Policies on service_catalog_item_addons
DROP POLICY IF EXISTS "Item addons viewable by org members" ON public.service_catalog_item_addons;
CREATE POLICY "Item addons viewable by org members" ON public.service_catalog_item_addons
FOR SELECT TO authenticated
USING (item_id IN (
    SELECT sc.id FROM public.service_catalog sc
    WHERE sc.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
));

DROP POLICY IF EXISTS "Item addons manageable by org admins" ON public.service_catalog_item_addons;
CREATE POLICY "Item addons manageable by org admins" ON public.service_catalog_item_addons
FOR ALL TO authenticated
USING (item_id IN (
    SELECT sc.id FROM public.service_catalog sc
    WHERE sc.organization_id IN (
        SELECT member.organization_id FROM public.organization_members member
        LEFT JOIN public.organization_roles role ON member.role_id = role.id
        WHERE member.user_id = auth.uid()
        AND (
            member.role IN ('owner', 'admin', 'manager')
            OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
        )
    )
))
WITH CHECK (item_id IN (
    SELECT sc.id FROM public.service_catalog sc
    WHERE sc.organization_id IN (
        SELECT member.organization_id FROM public.organization_members member
        LEFT JOIN public.organization_roles role ON member.role_id = role.id
        WHERE member.user_id = auth.uid()
        AND (
            member.role IN ('owner', 'admin', 'manager')
            OR role.name IN ('Owner', 'Admin', 'Manager', 'Dueño', 'Administrador')
        )
    )
));

DROP POLICY IF EXISTS "Public storefront view item addons" ON public.service_catalog_item_addons;
CREATE POLICY "Public storefront view item addons" ON public.service_catalog_item_addons
FOR SELECT TO anon, authenticated
USING (true);

COMMIT;
