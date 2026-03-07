-- Phase 4: Security & Verification
-- Mission: Harden RLS policies for agent tables to ensure native organization isolation.

BEGIN;

-- 1. Redesign Agent Availability Policy
-- The goal is to make it reliable using organization_members check.
DROP POLICY IF EXISTS "Agent Availability Organization Isolation" ON public.agent_availability;
CREATE POLICY "Agent Availability Organization Isolation" ON public.agent_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = agent_availability.organization_id 
            AND user_id = auth.uid()
        )
    );

-- 2. Redesign Agent Skills Policy
DROP POLICY IF EXISTS "Agent Skills Organization Isolation" ON public.agent_skills;
CREATE POLICY "Agent Skills Organization Isolation" ON public.agent_skills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = agent_skills.organization_id 
            AND user_id = auth.uid()
        )
    );

-- 3. Redesign Agent Channels Policy
DROP POLICY IF EXISTS "Agent Channels Organization Isolation" ON public.agent_channels;
CREATE POLICY "Agent Channels Organization Isolation" ON public.agent_channels
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = agent_channels.organization_id 
            AND user_id = auth.uid()
        )
    );

-- 4. Audit Policy for Assignment History
DROP POLICY IF EXISTS "System can insert assignment history" ON public.assignment_history;
CREATE POLICY "Users can view assignment history in their org" ON public.assignment_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = assignment_history.organization_id 
            AND user_id = auth.uid()
        )
    );

COMMIT;
