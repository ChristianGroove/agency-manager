-- Add notes field to clients table for storing client information like passwords, notes, etc.
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
