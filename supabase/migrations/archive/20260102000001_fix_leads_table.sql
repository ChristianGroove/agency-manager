-- Fix leads table to support dynamic pipeline stages
-- This migration removes any constraints on the status column

-- Drop any existing check constraint on status
DO $$ 
BEGIN
    -- Try to drop constraint if it exists
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- Ensure leads table has organization_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leads' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        
        -- Set organization_id for existing leads based on user
        UPDATE public.leads l
        SET organization_id = (
            SELECT om.organization_id
            FROM public.organization_members om
            WHERE om.user_id = l.user_id
            LIMIT 1
        )
        WHERE organization_id IS NULL;
        
        -- Make it NOT NULL after populating
        ALTER TABLE public.leads ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

-- Ensure status column is TEXT without constraints
DO $$
BEGIN
    -- Change status to TEXT if it's not already
    ALTER TABLE public.leads ALTER COLUMN status TYPE TEXT;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Update RLS policies to include organization isolation
DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
CREATE POLICY "Users can view leads"
    ON public.leads
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create leads" ON public.leads;
CREATE POLICY "Users can create leads"
    ON public.leads
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update their leads" ON public.leads;
CREATE POLICY "Users can update their leads"
    ON public.leads
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their leads" ON public.leads;
CREATE POLICY "Users can delete their leads"
    ON public.leads
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_leads_organization ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

COMMENT ON TABLE public.leads IS 'CRM leads with dynamic pipeline stages - status values come from pipeline_stages table';
COMMENT ON COLUMN public.leads.status IS 'Dynamic status from pipeline_stages.status_key (e.g. open, contacted, qualified, won, lost)';
