-- ============================================
-- ENTERPRISE RBAC V2: Dynamic Roles System
-- Date: 2026-01-08
-- Purpose: Move from Enum-based roles to Database-backed Dynamic Roles
-- ============================================

-- 1. Create organization_roles table
CREATE TABLE IF NOT EXISTS public.organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,          
    description TEXT,            
    is_system_role BOOLEAN DEFAULT false, -- True for "Owner", "Admin", "Member" (cannot be deleted)
    
    -- Hierarchy Level (Higher can manage Lower)
    -- Owner=3, Admin=2, Member=1
    hierarchy_level INTEGER DEFAULT 1, 
    
    -- Permissions JSONB (The source of truth)
    permissions JSONB DEFAULT '{}'::jsonb, 
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraint: Name unique per org
    UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view roles in their organization
DROP POLICY IF EXISTS "view_org_roles" ON public.organization_roles;
CREATE POLICY "view_org_roles" ON public.organization_roles
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Only Admins/Owners can manage roles (We will refine this with permissions later)
DROP POLICY IF EXISTS "manage_org_roles" ON public.organization_roles;
CREATE POLICY "manage_org_roles" ON public.organization_roles
    FOR ALL TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 2. Modify organization_members to link to roles
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.organization_roles(id);

CREATE INDEX IF NOT EXISTS idx_org_members_role_id ON organization_members(role_id);

-- 3. DATA MIGRATION: Seed System Roles and Migrate Users
-- We use a DO block to iterate through all organizations and ensure they have the 3 base roles.

DO $$
DECLARE
    org RECORD;
    owner_role_id UUID;
    admin_role_id UUID;
    member_role_id UUID;
BEGIN
    FOR org IN SELECT id FROM organizations LOOP
        
        -- A) Create OWNER Role
        INSERT INTO organization_roles (organization_id, name, description, is_system_role, hierarchy_level, permissions)
        VALUES (
            org.id, 
            'Dueño', 
            'Acceso total a todos los recursos y facturación.', 
            true, 
            3,
            '{"all": true}'::jsonb -- Owner has wildcard access
        )
        ON CONFLICT (organization_id, name) DO UPDATE SET 
            is_system_role = true, 
            hierarchy_level = 3
        RETURNING id INTO owner_role_id;

        -- B) Create ADMIN Role
        INSERT INTO organization_roles (organization_id, name, description, is_system_role, hierarchy_level, permissions)
        VALUES (
            org.id, 
            'Admin', 
            'Puede gestionar miembros y configuraciones operativas.', 
            true, 
            2,
            '{"admin.access": true}'::jsonb -- Placeholder for admin permission set
        )
        ON CONFLICT (organization_id, name) DO UPDATE SET 
            is_system_role = true, 
            hierarchy_level = 2
        RETURNING id INTO admin_role_id;

        -- C) Create MEMBER Role
        INSERT INTO organization_roles (organization_id, name, description, is_system_role, hierarchy_level, permissions)
        VALUES (
            org.id, 
            'Miembro', 
            'Acceso estándar a módulos funcionales.', 
            true, 
            1,
            '{}'::jsonb -- Basic access
        )
        ON CONFLICT (organization_id, name) DO UPDATE SET 
            is_system_role = true, 
            hierarchy_level = 1
        RETURNING id INTO member_role_id;

        -- D) Migrate Users in this Org based on their old 'role' enum
        -- Update Owners
        UPDATE organization_members 
        SET role_id = owner_role_id
        WHERE organization_id = org.id AND role = 'owner';

        -- Update Admins
        UPDATE organization_members 
        SET role_id = admin_role_id
        WHERE organization_id = org.id AND role = 'admin';

        -- Update Members
        UPDATE organization_members 
        SET role_id = member_role_id
        WHERE organization_id = org.id AND role = 'member';
        
    END LOOP;
END $$;

-- 4. Verification Check
-- Ensure no user is left without a role_id
-- SELECT count(*) FROM organization_members WHERE role_id IS NULL;
