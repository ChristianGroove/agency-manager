-- ============================================
-- CLEANUP ORPHAN ORGANIZATIONS TRIGGER
-- ============================================
-- When a user is deleted from auth.users, this trigger
-- automatically cleans up orphan organizations where
-- that user was the only member.
-- ============================================

-- Function to cleanup orphan organizations
CREATE OR REPLACE FUNCTION public.cleanup_orphan_organizations()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
    v_member_count INTEGER;
BEGIN
    -- Find all organizations where the deleted user was a member
    FOR v_org_id IN 
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = OLD.id
    LOOP
        -- Count remaining members after this user is deleted
        SELECT COUNT(*) INTO v_member_count
        FROM public.organization_members
        WHERE organization_id = v_org_id
        AND user_id != OLD.id;
        
        -- If no other members remain, delete the organization
        IF v_member_count = 0 THEN
            -- First delete the membership record
            DELETE FROM public.organization_members 
            WHERE organization_id = v_org_id AND user_id = OLD.id;
            
            -- Then delete the orphan organization
            DELETE FROM public.organizations 
            WHERE id = v_org_id;
            
            RAISE NOTICE 'Deleted orphan organization: %', v_org_id;
        ELSE
            -- Just delete the membership, keep the org
            DELETE FROM public.organization_members 
            WHERE organization_id = v_org_id AND user_id = OLD.id;
        END IF;
    END LOOP;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_cleanup_orphan_organizations ON auth.users;

-- Create trigger on auth.users BEFORE DELETE
-- Note: We use BEFORE DELETE so we can still access organization_members
CREATE TRIGGER trigger_cleanup_orphan_organizations
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_orphan_organizations();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_organizations() TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION public.cleanup_orphan_organizations() IS 
'Automatically deletes orphan organizations when their only member is deleted from auth.users.
Only deletes organizations with 0 remaining members to prevent data loss.';
