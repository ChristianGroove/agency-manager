-- ================================================
-- DYNAMIC DOCUMENT BRANDING - MIGRATION
-- ================================================
-- Purpose: Add branding columns + Preserve Pixy Agency styles
-- CRITICAL: Execute this BEFORE refactoring components
-- ================================================

-- Step 1: Add branding columns to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS document_primary_color TEXT DEFAULT '#6D28D9',
ADD COLUMN IF NOT EXISTS document_secondary_color TEXT DEFAULT '#EC4899',
ADD COLUMN IF NOT EXISTS document_logo_url TEXT,
ADD COLUMN IF NOT EXISTS document_logo_size TEXT DEFAULT 'medium' 
    CHECK (document_logo_size IN ('small', 'medium', 'large')),
ADD COLUMN IF NOT EXISTS document_template_style TEXT DEFAULT 'modern' 
    CHECK (document_template_style IN ('minimal', 'modern', 'classic')),
ADD COLUMN IF NOT EXISTS document_show_watermark BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS document_watermark_text TEXT,
ADD COLUMN IF NOT EXISTS document_font_family TEXT DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS document_header_text_color TEXT DEFAULT '#1F2937',
ADD COLUMN IF NOT EXISTS document_footer_text_color TEXT DEFAULT '#6B7280';

-- Step 2: CRITICAL - Preserve Pixy Agency's current visual identity
-- These values match the EXACT hardcoded styles in invoice-template.tsx and quote-template.tsx
UPDATE organization_settings
SET 
    -- Primary color: purple-600 from Wompi button (line 239 invoice-template.tsx)
    document_primary_color = '#6D28D9',
    
    -- Secondary color: pink-500 from gradients
    document_secondary_color = '#EC4899',
    
    -- Logo: current default
    document_logo_url = '/branding/logo dark.svg',
    
    -- Size: medium (h-12 for quote, h-11 for invoice)
    document_logo_size = 'medium',
    
    -- Style: matches current bold headers and clean design
    document_template_style = 'modern',
    
    -- Watermark: currently shown
    document_show_watermark = true,
    
    -- Header text: gray-900 (current)
    document_header_text_color = '#1F2937',
    
    -- Footer text: gray-400 (current legal text)
    document_footer_text_color = '#6B7280',
    
    -- Font: Inter (current)
    document_font_family = 'Inter'
WHERE organization_id = (
    SELECT id FROM organizations WHERE name = 'Pixy Agency' LIMIT 1
);

-- Step 3: Verification Query
-- Run this to confirm Pixy Agency has the correct values
SELECT 
    o.name as organization_name,
    os.document_primary_color,
    os.document_secondary_color,
    os.document_logo_size,
    os.document_template_style,
    os.document_show_watermark
FROM organization_settings os
JOIN organizations o ON os.organization_id = o.id
WHERE o.name = 'Pixy Agency';

-- Expected Output:
-- organization_name | document_primary_color | document_secondary_color | document_logo_size | document_template_style | document_show_watermark
-- Pixy Agency       | #6D28D9                | #EC4899                  | medium             | modern                  | true

-- ================================================
-- SAFE TO PROCEED CHECKLIST:
-- ================================================
-- [ ] All columns added successfully
-- [ ] Pixy Agency updated with correct values
-- [ ] Verification query shows expected output
-- [ ] Take screenshot of current Pixy invoice BEFORE refactoring
-- 
-- ⚠️ DO NOT PROCEED TO COMPONENT REFACTORING UNTIL CONFIRMED ⚠️
-- ================================================
