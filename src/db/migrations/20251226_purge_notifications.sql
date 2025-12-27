-- PURGE LEAKED NOTIFICATIONS
-- Delete notifications that don't belong to any organization to stop them from showing up everywhere.

DELETE FROM public.notifications 
WHERE organization_id IS NULL;

-- Optional: Verify that RLS is actually enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Re-apply strict policy just in case it wasn't run
DROP POLICY IF EXISTS "Tenant Isolation" ON public.notifications;
CREATE POLICY "Tenant Isolation" ON public.notifications
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
