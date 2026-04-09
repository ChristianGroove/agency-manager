-- Migration 20260311000002_add_zone_background.sql

-- Add background_style to support floor textures
ALTER TABLE public.resto_zones 
ADD COLUMN IF NOT EXISTS background_style VARCHAR(50) DEFAULT 'dots';

-- Add z_index support to visual elements (if needed in the future, handled by JSONB)
-- The rest of properties (decoratives) are already supported by the visual_elements JSONB array.
