-- Migration to add document styling columns to organization_settings
-- Created for Project ADN: Operations & Hardening

ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS document_header_text_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS document_footer_text_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS document_font_family text DEFAULT 'Inter';

-- Comment on columns for clarity
COMMENT ON COLUMN organization_settings.document_header_text_color IS 'Hex color for document headers (PDF)';
COMMENT ON COLUMN organization_settings.document_footer_text_color IS 'Hex color for document footers (PDF)';
COMMENT ON COLUMN organization_settings.document_font_family IS 'Font family for PDF documents';
