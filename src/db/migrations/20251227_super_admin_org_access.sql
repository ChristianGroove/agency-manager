-- ================================================================
-- SUPER ADMIN: Allow viewing ALL organizations
-- Run this to enable super_admins to see all tenants
-- ================================================================

-- Add policy: Super admins can read ALL organizations
CREATE POLICY "Super admins can view all organizations"
    ON public.organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.platform_role = 'super_admin'
        )
    );

-- Verify the new policy exists
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'organizations'
AND policyname = 'Super admins can view all organizations';

-- Test: Check if current user is super_admin
SELECT 
    u.email,
    p.platform_role,
    CASE 
        WHEN p.platform_role = 'super_admin' THEN '✅ You can view all organizations'
        ELSE '❌ Regular user - limited view'
    END as access_level
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.id = auth.uid();
