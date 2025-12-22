-- MIGRACIÓN DE REFERENCIA: SOPORTE PARA COLORES
-- Ejecutado el 2025-12-22

-- 1. Agregar valor al ENUM
ALTER TYPE briefing_field_type ADD VALUE IF NOT EXISTS 'color';

-- 2. Actualizar campos existentes
UPDATE briefing_fields
SET type = 'color'
WHERE name = 'preferred_colors' OR name = 'brand_colors';
