'use server';

import { createClient } from '@/lib/supabase-server';
import { getCurrentOrganizationId } from '@/modules/core/organizations/actions';
import { PERMISSIONS, PermissionString } from '../permissions';
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
export const hasPermission = cache(async (permission: PermissionString): Promise<boolean> => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const orgId = await getCurrentOrganizationId();
    if (!orgId) return false;

    // TODO: We could cache this result in Redis/KV for even faster access
    // For now, we query the flattened view or the join
    const { data, error } = await supabase
        .from('organization_members')
        .select(`
            role:organization_roles (
                permissions,
                hierarchy_level
            )
        `)
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .single();

    if (error || !data || !data.role) return false;

    const rolePermissions = (data.role as any).permissions || {};

    // 1. Check for Wildcard (Owner)
    if (rolePermissions['all'] === true) return true;

    // 2. Check specific permission
    return rolePermissions[permission] === true;
});

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
        permissions: role.permissions || {},
        hierarchy_level: role.hierarchy_level || 1, // Default to lowest
        // Prevent touching system flags or IDs if it's a new role
    };

    if (role.id) {
        // Update
        const { data: updatedRole, error } = await supabase
            .from('organization_roles')
            .update(payload)
            .eq('id', role.id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        return updatedRole;
    } else {
        // Create
        const { data: newRole, error } = await supabase
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

    const { error } = await supabase
        .from('organization_roles')
        .delete()
        .eq('id', roleId)
        .eq('organization_id', orgId);

    if (error) throw error;
    return { success: true };
}
