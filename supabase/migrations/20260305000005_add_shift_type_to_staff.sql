-- add shift_type to organization_staff
ALTER TABLE public.organization_staff ADD COLUMN IF NOT EXISTS shift_type text DEFAULT 'split' CHECK (shift_type IN ('continuous', 'split'));
