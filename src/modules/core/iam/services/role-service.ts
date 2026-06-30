'use server';

import { createClient } from '@/modules/core/database/supabase-server';
import { supabaseAdmin } from '@/modules/core/database/supabase-admin';
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions';
import { PERMISSIONS, PermissionString } from '../actions/permissions';
import { cache } from 'react';

export interface Role {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    is_system_role: boolean;
    hierarchy_level: number;
    permissions: Record<string, boolean>;
    member_count?: number;
}

function sanitizeRolePermissions(permissions: unknown): Record<string, boolean> {
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) return {};

    return Object.entries(permissions as Record<string, unknown>).reduce<Record<string, boolean>>((safePermissions, [key, value]) => {
        if (key === 'all') return safePermissions;
        if (typeof value === 'boolean') safePermissions[key] = value;
        return safePermissions;
    }, {});
}

function normalizeCustomRoleHierarchy(hierarchyLevel: unknown) {
    if (typeof hierarchyLevel !== 'number' || !Number.isFinite(hierarchyLevel)) return 1;
    return Math.max(1, Math.min(49, Math.floor(hierarchyLevel)));
}

/**
 * Get all roles for the current organization
 * Returns roles sorted by hierarchy level
 */
export async function getOrganizationRoles(): Promise<Role[]> {
    const supabase = await createClient();
    const orgId = await getCurrentOrganizationId();
    if (!orgId) return [];

    const { data, error } = await supabase
        .from('organization_roles')
        .select(`
            *,
            members:organization_members(count)
        `)
        .eq('organization_id', orgId)
        .order('hierarchy_level', { ascending: false })
        .order('name', { ascending: true });

    if (error) {
        console.error('[RoleService] Error fetching roles:', error);
        return [];
    }

    return data.map((role: any) => ({
        ...role,
        member_count: role.members?.[0]?.count || 0
    }));
}

/**
 * Verify if the current user has a specific permission
 * optimized with React Cache for minimal DB hits
 */
// Request-level cache to deduplicate DB queries when checking multiple permissions
const getUserPermissionsPayload = cache(async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const orgId = await getCurrentOrganizationId();
    if (!orgId) return null;

    // Query 1: Get the member row
    const { data: member, error } = await supabase
        .from('organization_members')
        .select('role, role_id, permissions')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .single();

    if (error || !member) return null;

    const memberOverrides = (member.permissions as any) || {};

    // Query 2: Get the role's permissions
    let rolePermissions: Record<string, any> = {};
    let isOwner = member.role === 'owner'; // Legacy Owner Fallback

    if (member.role_id) {
        const { data: roleData } = await supabase
            .from('organization_roles')
            .select('permissions, hierarchy_level')
            .eq('id', member.role_id)
            .single();

        if (roleData) {
            if (roleData.hierarchy_level === 100) isOwner = true;
            rolePermissions = (roleData.permissions as any) || {};
        }
    }

    return { isOwner, rolePermissions, memberOverrides };
});

export const hasPermission = async (permission: PermissionString): Promise<boolean> => {
    const payload = await getUserPermissionsPayload();
    if (!payload) return false;

    const { isOwner, rolePermissions, memberOverrides } = payload;

    // Wildcard Owner Access
    if (isOwner) return true;
    if (rolePermissions['all'] === true || memberOverrides['all'] === true) return true;

    // Specific Permission Check
    if (rolePermissions[permission] === true || memberOverrides[permission] === true) return true;

    return false;
};

/**
 * Create or Update a Custom Role
 */
export async function upsertRole(role: Partial<Role>) {
    const supabase = await createClient();
    const orgId = await getCurrentOrganizationId();
    if (!orgId) throw new Error('No Organization Context');

    // Security Check: Only those with MANAGE_ROLES can do this
    const canManage = await hasPermission(PERMISSIONS.ORG.MANAGE_ROLES);
    // Bootstrap: Owners (who have 'all': true) will pass this. 
    // If permission system is fresh, ensure we don't lock ourselves out.
    // The 'hasPermission' logic above handles 'all': true.

    if (!canManage) throw new Error('Unauthorized: Missing MANAGE_ROLES permission');

    // Validation
    if (!role.name) throw new Error('Role name is required');

    const payload = {
        organization_id: orgId,
        name: role.name,
        description: role.description,
        permissions: sanitizeRolePermissions(role.permissions),
        hierarchy_level: normalizeCustomRoleHierarchy(role.hierarchy_level),
        // Prevent touching system flags or IDs if it's a new role
    };

    if (role.id) {
        const { data: existingRole, error: existingRoleError } = await (await createClient())
            .from('organization_roles')
            .select('name, description, is_system_role, hierarchy_level')
            .eq('id', role.id)
            .eq('organization_id', orgId)
            .single();

        if (existingRoleError || !existingRole) throw new Error('Role not found');
        
        if (existingRole.is_system_role) throw new Error('Cannot modify a System Role');

        // Update
        // Use supabaseAdmin to bypass PostgreSQL RLS infinite recursion (42P17 error).
        // Security is maintained because we explicitly checked hasPermission above.
        const { data: updatedRole, error } = await supabaseAdmin
            .from('organization_roles')
            .update(payload)
            .eq('id', role.id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) {
            console.error('[RoleService] Update Error:', error);
            throw error;
        }
        return updatedRole;
    } else {
        // Create
        // Use supabaseAdmin to bypass RLS recursion limits.
        const { data: newRole, error } = await supabaseAdmin
            .from('organization_roles')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return newRole;
    }
}

/**
 * Delete a Custom Role
 */
export async function deleteRole(roleId: string) {
    const supabase = await createClient();
    const orgId = await getCurrentOrganizationId();

    const canManage = await hasPermission(PERMISSIONS.ORG.MANAGE_ROLES);
    if (!canManage) throw new Error('Unauthorized');

    // Check if system role
    const { data: role } = await supabase.from('organization_roles').select('is_system_role').eq('id', roleId).single();
    if (role?.is_system_role) throw new Error('Cannot delete a System Role');

    // Delete
    // Use supabaseAdmin to bypass RLS recursion limits.
    const { error } = await (await createClient())
        .from('organization_roles')
        .delete()
        .eq('id', roleId)
        .eq('organization_id', orgId);

    if (error) throw error;
    return { success: true };
}

/**
 * Seed Default Roles for a New Organization
 */
export async function seedDefaultRoles(orgId: string) {
    const supabase = await createClient();

    const roles = [
        {
            organization_id: orgId,
            name: 'Dueño',
            description: 'Acceso total y administrativo a la organización',
            is_system_role: true,
            hierarchy_level: 100,
            permissions: { all: true }
        },
        {
            organization_id: orgId,
            name: 'Administrador',
            description: 'Puede gestionar miembros, roles y configuraciones',
            is_system_role: true,
            hierarchy_level: 50,
            permissions: {
                // Administrative
                [PERMISSIONS.ORG.MANAGE_MEMBERS]: true,
                [PERMISSIONS.ORG.MANAGE_ROLES]: true,
                [PERMISSIONS.ORG.MANAGE_BILLING]: true,
                [PERMISSIONS.ORG.VIEW_AUDIT_LOGS]: true,

                // Standard Modules
                [PERMISSIONS.CRM.VIEW_LEADS]: true,
                [PERMISSIONS.CRM.EDIT_LEADS]: true,
                [PERMISSIONS.INBOX.VIEW_ALL]: true,
                [PERMISSIONS.INBOX.TEAM_VIEW]: true,
                [PERMISSIONS.INBOX.GLOBAL_VIEW]: false,
                [PERMISSIONS.INBOX.ASSIGN_AGENTS]: true,
                [PERMISSIONS.AUTOMATION.VIEW]: true
            }
        },
        {
            organization_id: orgId,
            name: 'Miembro',
            description: 'Acceso estándar a funciones de operación',
            is_system_role: true,
            hierarchy_level: 10,
            permissions: {
                [PERMISSIONS.CRM.VIEW_LEADS]: true,
                [PERMISSIONS.INBOX.VIEW_ALL]: false,
                [PERMISSIONS.INBOX.TEAM_VIEW]: false,
                [PERMISSIONS.INBOX.GLOBAL_VIEW]: false,
                [PERMISSIONS.INBOX.ASSIGN_AGENTS]: false
            }
        }
    ];

    const { error } = await supabase
        .from('organization_roles')
        .insert(roles);

    if (error) {
        console.error('Failed to seed roles:', error);
        throw error;
    }

    return { success: true };
}

