-- ================================================================
-- PLATFORM ROLES: Global User Role System
-- Created: 2025-12-27
-- Purpose: Enable platform-level admin access independent of org
-- ================================================================

-- ================================================================
-- 1. CREATE PROFILES TABLE (if doesn't exist)
-- ================================================================

-- Create profiles table if you don't have one
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    platform_role TEXT DEFAULT 'user' CHECK (platform_role IN ('user', 'super_admin', 'support')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

-- Policy: Users can update their own profile (but NOT platform_role)
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        platform_role = (SELECT platform_role FROM public.profiles WHERE id = auth.uid())
    );

-- ================================================================
-- 2. ADD PLATFORM_ROLE COLUMN (if profiles exists but column doesn't)
-- ================================================================

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        -- Add column if doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'profiles' 
            AND column_name = 'platform_role'
        ) THEN
            ALTER TABLE public.profiles 
            ADD COLUMN platform_role TEXT DEFAULT 'user'
                CHECK (platform_role IN ('user', 'super_admin', 'support'));
        END IF;
    END IF;
END $$;

-- ================================================================
-- 3. CREATE INDEX
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_platform_role 
    ON public.profiles(platform_role) 
    WHERE platform_role != 'user';

-- ================================================================
-- 4. TRIGGER: Auto-create profile on user signup
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, platform_role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- 5. MANUAL STEP: ASSIGN YOURSELF AS SUPER ADMIN
-- ⚠️ IMPORTANT: Replace 'your.email@pixy.com' with YOUR actual email
-- ================================================================

-- Step 1: Find your user ID
-- SELECT id, email FROM auth.users WHERE email = 'your.email@pixy.com';

-- Step 2: Assign super_admin role (UNCOMMENT AND UPDATE EMAIL)
/*
UPDATE public.profiles 
SET platform_role = 'super_admin'
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'your.email@pixy.com'
);
*/

-- ================================================================
-- 6. VERIFICATION QUERIES
-- ================================================================

-- Check all super admins
SELECT 
    u.email,
    p.platform_role,
    p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE p.platform_role = 'super_admin';

-- Check your specific role
/*
SELECT 
    u.email,
    p.platform_role,
    CASE 
        WHEN p.platform_role = 'super_admin' THEN '✅ You are a Super Admin'
        WHEN p.platform_role = 'support' THEN '⚠️ You have Support access'
        ELSE '❌ Regular user (update the SQL above!)'
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'your.email@pixy.com';
*/

-- Count users by role
SELECT 
    platform_role,
    COUNT(*) as user_count
FROM public.profiles
GROUP BY platform_role
ORDER BY 
    CASE platform_role
        WHEN 'super_admin' THEN 1
        WHEN 'support' THEN 2
        WHEN 'user' THEN 3
    END;

-- ================================================================
-- 7. SECURITY: Prevent role self-elevation
-- ================================================================

-- Policy: Only super admins can change platform_role
CREATE POLICY "Only super_admins can modify platform_role"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND platform_role = 'super_admin'
        )
    );

-- ================================================================
-- NOTES:
-- 1. Run sections 1-4 first
-- 2. Update and run section 5 to assign yourself super_admin
-- 3. Run section 6 to verify
-- 4. Never assign super_admin via client code - always via SQL
-- ================================================================
