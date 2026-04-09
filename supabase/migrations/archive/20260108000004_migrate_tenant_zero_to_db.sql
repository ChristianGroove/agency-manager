-- ============================================
-- SECURITY MIGRATION: Harden Platform Roles
-- Date: 2026-01-08
-- Purpose: Persist "Tenant Zero" ownership to Database Role
--          so we can remove the fragile code logic.
-- ============================================

-- 1. Ensure profiles table has the column (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' 
        AND column_name = 'platform_role'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN platform_role TEXT DEFAULT 'user'
            CHECK (platform_role IN ('user', 'super_admin', 'support'));
    END IF;
END $$;

-- 2. "MIGRATE" Tenant Zero Owner to Super Admin
-- This finds the owner of the FIRST created organization
-- and explicitly grants them 'super_admin' role in the DB.
-- This makes the implicit code logic explicit in the database.

WITH tenant_zero_owner AS (
    SELECT om.user_id
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.role = 'owner'
    ORDER BY o.created_at ASC
    LIMIT 1
)
UPDATE public.profiles
SET platform_role = 'super_admin'
WHERE id = (SELECT user_id FROM tenant_zero_owner)
  AND (platform_role IS NULL OR platform_role = 'user');

-- 3. Verification
-- Returns who is now a super_admin
SELECT u.email, p.platform_role 
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE p.platform_role = 'super_admin';
