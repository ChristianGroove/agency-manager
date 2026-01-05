-- ================================================================
-- MEMBER PERMISSIONS: Granular User Permission System
-- Created: 2026-01-04
-- Purpose: Add per-member permission overrides for modules and features
-- ================================================================

-- 1. Add permissions JSONB column to organization_members
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- 2. Add index for fast permission lookups
CREATE INDEX IF NOT EXISTS idx_org_members_permissions 
ON organization_members USING gin(permissions);

-- 3. Example permission structure (for documentation):
/*
{
    "modules": {
        "crm": true,
        "invoicing": false,
        "projects": true
    },
    "features": {
        "can_invite_members": false,
        "can_edit_settings": false,
        "can_create_invoices": true,
        "can_delete_invoices": false,
        "can_view_reports": true
    }
}
*/

-- 4. Helper function to check if user has a specific permission
CREATE OR REPLACE FUNCTION check_member_permission(
    p_org_id UUID,
    p_user_id UUID,
    p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
    v_permissions JSONB;
    v_permission_value BOOLEAN;
BEGIN
    -- Get member's role and permissions
    SELECT role, permissions INTO v_role, v_permissions
    FROM organization_members
    WHERE organization_id = p_org_id AND user_id = p_user_id;
    
    -- Owners and Admins have all permissions by default
    IF v_role IN ('owner', 'admin') THEN
        -- Check if explicitly disabled
        v_permission_value := v_permissions->'features'->>p_permission;
        IF v_permission_value IS NOT NULL AND v_permission_value = false THEN
            RETURN false;
        END IF;
        RETURN true;
    END IF;
    
    -- For members, check explicit permission
    v_permission_value := v_permissions->'features'->>p_permission;
    RETURN COALESCE(v_permission_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper function to check module access
CREATE OR REPLACE FUNCTION check_member_module_access(
    p_org_id UUID,
    p_user_id UUID,
    p_module TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
    v_permissions JSONB;
    v_module_value BOOLEAN;
BEGIN
    -- Get member's role and permissions
    SELECT role, permissions INTO v_role, v_permissions
    FROM organization_members
    WHERE organization_id = p_org_id AND user_id = p_user_id;
    
    -- Owners have all module access
    IF v_role = 'owner' THEN
        RETURN true;
    END IF;
    
    -- Check explicit module setting
    v_module_value := (v_permissions->'modules'->>p_module)::boolean;
    
    -- If not set, default to true for admins, false for members
    IF v_module_value IS NULL THEN
        RETURN v_role = 'admin';
    END IF;
    
    RETURN v_module_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- VERIFICATION
-- ================================================================
-- Check that column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organization_members' 
AND column_name = 'permissions';
