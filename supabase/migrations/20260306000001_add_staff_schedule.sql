-- Añadir el JSONB para horarios particulares de cada empleado.
-- Si es null, podría heredar de la Sede o asumir un horario abierto.

ALTER TABLE public.organization_staff
ADD COLUMN work_schedule JSONB DEFAULT NULL;

COMMENT ON COLUMN public.organization_staff.work_schedule IS 'Horario individualizado del colaborador, capaz de soportar split blocks (block_1 y block_2)';
