-- Migration: Upgrade messaging_templates for Meta Structure
-- Date: 2026-01-10

ALTER TABLE messaging_templates
ADD COLUMN IF NOT EXISTS components JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'es',
ADD COLUMN IF NOT EXISTS meta_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';

-- Values: 'APPROVED', 'REJECTED', 'PENDING', 'PAUSED', 'DISABLED'

COMMENT ON COLUMN messaging_templates.components IS 'Stores the Meta Template Structure (Header, Body, Footer, Buttons)';
