-- Migration: 20260922000001_add_can_bulk_delete_tasks_to_staff.sql
-- Description: Add can_bulk_delete_tasks column to organization_staff for granular mass task deletion permission

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_staff' 
        AND column_name = 'can_bulk_delete_tasks'
    ) THEN 
        ALTER TABLE public.organization_staff 
        ADD COLUMN can_bulk_delete_tasks BOOLEAN DEFAULT false;
    END IF;
END $$;
