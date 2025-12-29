-- Fix: Enhance Organization Members with User Details (Denormalization)
-- Migration ID: 20251228_enhance_org_members
-- Solves: "column organization_members.full_name does not exist"

-- 1. Add Columns
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create Function to Sync from Auth (Security Definer allows reading auth.users)
CREATE OR REPLACE FUNCTION public.sync_member_details()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the member record with data from auth.users
    -- We join on the NEW.user_id
    UPDATE public.organization_members
    SET 
        full_name = COALESCE(
            (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = NEW.user_id), 
            'Unknown'
        ),
        email = (SELECT email FROM auth.users WHERE id = NEW.user_id),
        avatar_url = (SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = NEW.user_id)
    WHERE user_id = NEW.user_id AND organization_id = NEW.organization_id;

    RETURN NEW;
END;
$$;

-- 3. Trigger on Insert to Organization Members
DROP TRIGGER IF EXISTS tr_sync_member_details ON public.organization_members;
CREATE TRIGGER tr_sync_member_details
AFTER INSERT ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_member_details();

-- 4. Backfill Existing Members (One-time)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM public.organization_members LOOP
        UPDATE public.organization_members
        SET 
            full_name = COALESCE(
                (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = r.user_id), 
                'Unknown'
            ),
            email = (SELECT email FROM auth.users WHERE id = r.user_id),
            avatar_url = (SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = r.user_id)
        WHERE organization_id = r.organization_id AND user_id = r.user_id;
    END LOOP;
END $$;
