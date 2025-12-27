-- FINAL FIX: Notification Isolation
-- This script ensures complete isolation of notifications per organization

-- 1. Delete ALL notifications without organization_id (orphaned/leaked data)
DELETE FROM public.notifications WHERE organization_id IS NULL;

-- 2. Enable RLS (if not already enabled)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Tenant Isolation" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their org notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their org notifications" ON public.notifications;

-- 4. Create strict RLS policy for SELECT (view)
CREATE POLICY "Users can view their org notifications" ON public.notifications
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- 5. Create strict RLS policy for INSERT (create)
CREATE POLICY "Users can insert their org notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- 6. Create policy for UPDATE (mark as read)
CREATE POLICY "Users can update their org notifications" ON public.notifications
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- 7. Create policy for DELETE (if needed)
CREATE POLICY "Users can delete their org notifications" ON public.notifications
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Verify the setup
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'notifications';
