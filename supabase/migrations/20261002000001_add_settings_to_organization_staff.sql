-- Migration: 20261002000001_add_settings_to_organization_staff.sql
-- Description: Add settings JSONB column to public.organization_staff for collaborator capabilities and governance

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_staff' 
        AND column_name = 'settings'
    ) THEN 
        ALTER TABLE public.organization_staff 
        ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
