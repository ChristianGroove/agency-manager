-- Fix RLS for organization_sequences
-- Allow the get_next_sequence_value function to write

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members view sequences" ON public.organization_sequences;
DROP POLICY IF EXISTS "System can manage sequences" ON public.organization_sequences;

-- Create new policies
CREATE POLICY "Members view sequences" ON public.organization_sequences
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "System can manage sequences" ON public.organization_sequences
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_next_sequence_value(UUID, TEXT) TO authenticated;
