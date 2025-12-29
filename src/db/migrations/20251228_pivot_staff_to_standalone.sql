-- Migration: Pivot Staff to Standalone Entities (Decoupled from Users)
-- ID: 20251228_pivot_staff_to_standalone
-- Goal: Allow creating staff members without creating platform user accounts. Staff will access via 'access_token'.

-- 1. Modify 'cleaning_staff_profiles' to be independent
ALTER TABLE cleaning_staff_profiles
    -- Make member_id nullable first (in case we want to keep hybrid approach later), or just drop logic.
    -- Plan says: "Remove strict FK to users". User says "Reverse logic".
    -- We will keep member_id as optional (nullable) for backward compatibility or if an ADMIN wants to be a CLEANER too.
    ALTER COLUMN member_id DROP NOT NULL,
    -- Drop the unique constraint if it exists strictly on member_id, but usually we want one profile per member IF LINKED.
    -- However, now we can have profiles without member_id.
    
    -- Add new standalone identity fields
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    
    -- Add access token for the worker portal
    ADD COLUMN IF NOT EXISTS access_token UUID DEFAULT gen_random_uuid(),
    
    -- Add status (since they are not 'users' with auth status anymore)
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    
    -- Add avatar support directly on profile
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,

    -- Add role (missing from initial schema)
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'cleaner';

-- 2. Create index for fast token lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_cleaning_staff_token ON cleaning_staff_profiles(access_token);

-- 3. Update existing records?
-- If there are existing records linked to members, we should copy their data to the new columns to ensure standalone integrity.
/* 
-- Optional Backfill: Temporarily disabled to avoid 'users' table not found errors.
-- If you need to backfill data from existing users, run this manually adapting to your schema (e.g., auth.users or public.profiles).
DO $$
BEGIN
    UPDATE cleaning_staff_profiles csp
    SET 
        first_name = SPLIT_PART(u.full_name, ' ', 1),
        last_name = SUBSTRING(u.full_name FROM STRPOS(u.full_name, ' ') + 1),
        email = u.email
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE csp.member_id = om.id
    AND csp.first_name IS NULL; 
END $$;
*/
