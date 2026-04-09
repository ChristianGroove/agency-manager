-- ============================================
-- FIX LOCALIZATION: Update role names/descriptions to Spanish
-- Date: 2026-01-08 (Post-Migration Fix)
-- ============================================

DO $$
BEGIN
    -- Update Owner Roles
    UPDATE organization_roles
    SET name = 'Dueño',
        description = 'Acceso total a todos los recursos y facturación.'
    WHERE name = 'Owner' AND is_system_role = true;

    -- Update Admin Roles (Keep name Admin but translate desc)
    UPDATE organization_roles
    SET description = 'Puede gestionar miembros y configuraciones operativas.'
    WHERE name = 'Admin' AND is_system_role = true;

    -- Update Member Roles
    UPDATE organization_roles
    SET name = 'Miembro',
        description = 'Acceso estándar a módulos funcionales.'
    WHERE name = 'Member' AND is_system_role = true;

END $$;
