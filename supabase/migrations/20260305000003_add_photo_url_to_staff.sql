-- Migración: Agregar Photo URL a Staff
-- Fecha: 2026-03-05

ALTER TABLE public.organization_staff ADD COLUMN IF NOT EXISTS photo_url TEXT;
