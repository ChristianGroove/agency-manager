-- Migración: Añadir configuración de Motor de Nómina y Extras al Staff y Turnos
-- Fecha: 2026-03-05
-- Descripción: Agrega campos para calcular horas extras y duración obligatoria de descansos.

-- 1. Configuraciones individuales por Personal (Si aplican horas extras y descansos)
ALTER TABLE public.organization_staff
ADD COLUMN IF NOT EXISTS expected_hours_per_day DECIMAL(4,2) DEFAULT 8.0,
ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 120;

-- 2. Consolidación en los Turnos (Shifts)
ALTER TABLE public.attendance_shifts
ADD COLUMN IF NOT EXISTS ordinary_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_minutes_pending INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_minutes_approved INTEGER DEFAULT 0;

-- 3. Trigger opcional para recálculo automático al cerrar turno (se manejará desde Server Actions)
-- Nota: Dejamos la lógica matemática pesada en la Server Action para aliviar la base de datos 
-- y permitir inyección de zona horaria de las "Sedes".
