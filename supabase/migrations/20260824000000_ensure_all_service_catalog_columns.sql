-- ==============================================================================
-- MIGRATION: 20260824000000_ensure_all_service_catalog_columns.sql
-- PURPOSE: Ensure 100% of service_catalog columns, foreign keys and indexes exist
-- MODULE: Universal Multi-Industry Catalog
-- IDEMPOTENT: Safe to run multiple times without data loss or conflicts
-- ==============================================================================

BEGIN;

-- 1. Essential Columns on public.service_catalog
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS real_estate_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS cta_type TEXT DEFAULT 'whatsapp',
ADD COLUMN IF NOT EXISTS price_label_type TEXT DEFAULT 'price',
ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS featured_badge TEXT,
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'service',
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_backorders BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS variants_config JSONB DEFAULT '{"attributes": []}'::jsonb,
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
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_visible_in_portal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Backfill nulls for legacy data
UPDATE public.service_catalog SET is_active = true WHERE is_active IS NULL;
UPDATE public.service_catalog SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.service_catalog SET is_visible_in_portal = true WHERE is_visible_in_portal IS NULL;
UPDATE public.service_catalog SET order_index = 0 WHERE order_index IS NULL;
UPDATE public.service_catalog SET classification = 'service' WHERE classification IS NULL;

-- 3. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_service_catalog_is_active ON public.service_catalog USING btree (organization_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_catalog_category_id ON public.service_catalog USING btree (organization_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_catalog_classification ON public.service_catalog USING btree (organization_id, classification) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_catalog_sku ON public.service_catalog USING btree (organization_id, sku) WHERE deleted_at IS NULL;

-- 4. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';

COMMIT;
