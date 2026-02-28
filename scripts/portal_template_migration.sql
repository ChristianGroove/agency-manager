-- Migración: Soporte para Motor de Portales (Portal Layout Engine)
-- Este script introduce el campo que definirá qué "Molde" de interfaz usa el Space.

-- 1. Añadimos la columna a la tabla de Spaces
ALTER TABLE public.saas_apps 
ADD COLUMN IF NOT EXISTS portal_template TEXT DEFAULT 'b2b_dashboard' NOT NULL;

-- 2. Aseguramos que los Spaces existentes apunten a este molde por defecto
UPDATE public.saas_apps 
SET portal_template = 'b2b_dashboard';
