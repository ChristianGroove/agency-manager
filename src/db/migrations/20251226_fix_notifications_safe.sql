-- SAFE VERSION: Notification Isolation (Idempotent)
-- This version can be run multiple times without errors

-- 1. Delete orphaned notifications
DELETE FROM public.notifications WHERE organization_id IS NULL;

-- 2. Enable RLS (safe if already enabled)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies (safe with IF EXISTS)
DROP POLICY IF EXISTS "Tenant Isolation" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their org notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their org notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their org notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their org notifications" ON public.notifications;

-- 4. Create fresh policies
CREATE POLICY "Users can view their org notifications" ON public.notifications
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their org notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their org notifications" ON public.notifications
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their org notifications" ON public.notifications
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Success message
SELECT 'Notification isolation configured successfully!' as status;
