-- ================================================================
-- FIX: Add INSERT policy for profile creation
-- Run this to allow users to create their own profile
-- ================================================================

-- Drop existing UPDATE policy that's too restrictive
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Add INSERT policy: Users can create their own profile (once)
CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Re-add UPDATE policy: Users can update their own profile (but NOT platform_role)
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        platform_role = (SELECT platform_role FROM public.profiles WHERE id = auth.uid())
    );

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
