-- DATA REPAIR: Fix missing role_ids and ensure System Roles exist for all orgs.

DO $$
DECLARE
    org RECORD;
    owner_role_id UUID;
    admin_role_id UUID;
    member_role_id UUID;
BEGIN
    FOR org IN SELECT id FROM organizations LOOP
        
        -- 1. Ensure OWNER Role exists (English or Spanish)
        -- Try to find existing first to avoid duplicate errors if names differ
        SELECT id INTO owner_role_id FROM organization_roles 
        WHERE organization_id = org.id AND (name = 'Owner' OR name = 'Dueño') AND is_system_role = true LIMIT 1;

        IF owner_role_id IS NULL THEN
            -- Create it if missing
            INSERT INTO organization_roles (organization_id, name, description, is_system_role, hierarchy_level, permissions)
            VALUES (org.id, 'Dueño', 'Acceso total', true, 3, '{"all": true}'::jsonb)
            RETURNING id INTO owner_role_id;
        ELSE
            -- Ensure it has correct permissions
             UPDATE organization_roles SET permissions = '{"all": true}'::jsonb, hierarchy_level = 3
             WHERE id = owner_role_id;
        END IF;

        -- 2. Ensure ADMIN Role
        SELECT id INTO admin_role_id FROM organization_roles 
        WHERE organization_id = org.id AND (name = 'Admin' OR name = 'Administrador') AND is_system_role = true LIMIT 1;

        IF admin_role_id IS NULL THEN
            INSERT INTO organization_roles (organization_id, name, description, is_system_role, hierarchy_level, permissions)
            VALUES (
                org.id, 
                'Administrador', 
                'Gestión operativa', 
                true, 
                2, 
                '{"org.manage_members": true, "org.manage_roles": true, "org.manage_settings": true}'::jsonb
            )
            RETURNING id INTO admin_role_id;
        END IF;

        -- 3. Ensure MEMBER Role
        SELECT id INTO member_role_id FROM organization_roles 
        WHERE organization_id = org.id AND (name = 'Member' OR name = 'Miembro') AND is_system_role = true LIMIT 1;

        IF member_role_id IS NULL THEN
            INSERT INTO organization_roles (organization_id, name, description, is_system_role, hierarchy_level, permissions)
            VALUES (org.id, 'Miembro', 'Acceso estándar', true, 1, '{}'::jsonb)
            RETURNING id INTO member_role_id;
        END IF;

        -- 4. REPAIR: Update Members with missing role_id
        
        -- Fix Owners
        UPDATE organization_members 
        SET role_id = owner_role_id
        WHERE organization_id = org.id AND role = 'owner' AND role_id IS NULL;

        -- Fix Admins
        UPDATE organization_members 
        SET role_id = admin_role_id
        WHERE organization_id = org.id AND role = 'admin' AND role_id IS NULL;

        -- Fix Members
        UPDATE organization_members 
        SET role_id = member_role_id
        WHERE organization_id = org.id AND role = 'member' AND role_id IS NULL;
        
    END LOOP;
END $$;
