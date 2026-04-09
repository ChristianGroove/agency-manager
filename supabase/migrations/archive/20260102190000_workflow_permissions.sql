-- Workflow Permissions Schema
-- Granular permissions for workflow access and management

-- Create permissions enum for workflows
DO $$ BEGIN
    CREATE TYPE workflow_role AS ENUM ('viewer', 'editor', 'approver', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Workflow permissions table
CREATE TABLE IF NOT EXISTS workflow_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role workflow_role NOT NULL DEFAULT 'viewer',
    
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(workflow_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_permissions_workflow ON workflow_permissions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_permissions_user ON workflow_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_permissions_org ON workflow_permissions(organization_id);

-- RLS Policies
ALTER TABLE workflow_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view permissions for workflows they have access to
CREATE POLICY "Users can view permissions"
    ON workflow_permissions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Only admins or workflow owners can manage permissions
CREATE POLICY "Admins can manage permissions"
    ON workflow_permissions
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Helper function to check workflow permission
CREATE OR REPLACE FUNCTION check_workflow_permission(
    p_workflow_id UUID,
    p_user_id UUID,
    p_required_role workflow_role
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_role workflow_role;
    v_org_role text;
BEGIN
    -- Check organization role first (Owners/Admins have full access)
    SELECT role INTO v_org_role
    FROM organization_members
    WHERE organization_id = (SELECT organization_id FROM workflows WHERE id = p_workflow_id)
    AND user_id = p_user_id;
    
    IF v_org_role IN ('owner', 'admin') THEN
        RETURN TRUE;
    END IF;

    -- Get specific workflow permission
    SELECT role INTO v_user_role
    FROM workflow_permissions
    WHERE workflow_id = p_workflow_id AND user_id = p_user_id;

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Role hierarchy check
    -- admin > approver > editor > viewer
    IF p_required_role = 'viewer' THEN
        RETURN TRUE; -- Any role can view
    ELSIF p_required_role = 'editor' THEN
        RETURN v_user_role IN ('editor', 'approver', 'admin');
    ELSIF p_required_role = 'approver' THEN
        RETURN v_user_role IN ('approver', 'admin');
    ELSIF p_required_role = 'admin' THEN
        RETURN v_user_role = 'admin';
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
