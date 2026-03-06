-- Migración: Estructura de Dirección para Sedes
-- Fecha: 2026-03-05

ALTER TABLE public.organization_locations 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Colombia',
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;
