-- FIX: Race Condition in ID Generation
-- Description: Implement Atomic Sequential IDs per Organization
-- Date: 2025-12-29
-- Author: Antigravity

-- 1. Table to track sequences per organization
-- Instead of COUNT(*), we store the last used number.
CREATE TABLE IF NOT EXISTS public.organization_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'quote', 'invoice', 'job'
    last_number INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT unique_org_entity UNIQUE (organization_id, entity_type)
);

-- RLS
ALTER TABLE public.organization_sequences ENABLE ROW LEVEL SECURITY;
-- Only system can write ideally, but for now allow members to read/indirectly update via functions
CREATE POLICY "Members view sequences" ON public.organization_sequences
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );


-- 2. Atomic Function to get Next ID
-- This locks the row, increments, and returns the new value safely.
CREATE OR REPLACE FUNCTION public.get_next_sequence_value(
    org_id UUID,
    entity_key TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    next_val INTEGER;
BEGIN
    -- Upsert the sequence record and increment atomically
    INSERT INTO public.organization_sequences (organization_id, entity_type, last_number)
    VALUES (org_id, entity_key, 1)
    ON CONFLICT (organization_id, entity_type)
    DO UPDATE SET 
        last_number = public.organization_sequences.last_number + 1,
        updated_at = now()
    RETURNING last_number INTO next_val;
    
    RETURN next_val;
END;
$$;
