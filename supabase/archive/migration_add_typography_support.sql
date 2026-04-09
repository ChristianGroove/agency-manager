-- MIGRACIÓN DE REFERENCIA: SOPORTE PARA TIPOGRAFÍA
-- Ejecutado el 2025-12-22

-- 1. Agregar valor al ENUM
ALTER TYPE briefing_field_type ADD VALUE IF NOT EXISTS 'typography';

-- 2. Actualizar campos existentes
-- Usamos ILIKE para encontrar los campos relevantes en los templates ya insertados
UPDATE briefing_fields
SET 
  type = 'typography',
  label = 'Estilo de Tipografía Preferido',
  help_text = 'Selecciona los estilos que mejor representen la personalidad de tu marca.'
WHERE label ILIKE '%Tipografías conocidas%' OR label ILIKE '%Estilo de tipografía%';
