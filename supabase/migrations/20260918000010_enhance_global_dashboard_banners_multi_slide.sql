-- Migration: Enhance Global Dashboard Banners with Multi-Slide & Scheduling
-- Description: Adds JSONB slides column for sequence of up to 5 slides, and timestamps for scheduling.

DO $$
BEGIN
    -- Add slides JSONB column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'global_dashboard_banners' 
          AND column_name = 'slides'
    ) THEN
        ALTER TABLE public.global_dashboard_banners 
        ADD COLUMN slides JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add starts_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'global_dashboard_banners' 
          AND column_name = 'starts_at'
    ) THEN
        ALTER TABLE public.global_dashboard_banners 
        ADD COLUMN starts_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    -- Add expires_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'global_dashboard_banners' 
          AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.global_dashboard_banners 
        ADD COLUMN expires_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- Populate existing rows where slides is empty with a legacy slide representation
UPDATE public.global_dashboard_banners
SET slides = jsonb_build_array(
    jsonb_build_object(
        'id', 'legacy-' || id::text,
        'title', COALESCE(title, 'Banner'),
        'phrases', CASE 
            WHEN jsonb_typeof(description) = 'array' THEN 
                (SELECT jsonb_agg(jsonb_build_object('text', elem, 'durationSeconds', 8)) FROM jsonb_array_elements_text(description) AS elem)
            WHEN description IS NOT NULL AND description::text != 'null' THEN 
                jsonb_build_array(jsonb_build_object('text', description::text, 'durationSeconds', 8))
            ELSE 
                jsonb_build_array(jsonb_build_object('text', 'Bienvenido a Pixy', 'durationSeconds', 8))
        END,
        'cta_text', COALESCE(cta_text, ''),
        'cta_url', COALESCE(cta_url, ''),
        'cta_open_new_tab', false,
        'cta_variant', 'default',
        'media_type', COALESCE(media_type, 'json_lottie'),
        'media_url', COALESCE(media_url, ''),
        'layout_pos', COALESCE(layout_pos, 'right'),
        'theme', COALESCE(theme, 'brand_primary'),
        'showSubtitle', false,
        'subtitle', '',
        'kicker', '',
        'titleColor', 'default',
        'kickerColor', 'brand_primary',
        'subtitleColor', 'muted',
        'phrasesColor', 'default'
    )
)
WHERE slides IS NULL OR slides = '[]'::jsonb;
