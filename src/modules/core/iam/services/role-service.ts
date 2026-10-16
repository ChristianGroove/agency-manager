'use server';

import { createClient } from '@/modules/core/database/supabase-server';
import { supabaseAdmin } from '@/modules/core/database/supabase-admin';
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions';
import { isSuperAdmin } from '@/modules/core/iam/services/platform-roles';
import { PERMISSIONS, PERMISSION_GROUPS, PermissionString, normalizeRoleRecord, resolveSystemRoleKind, sanitizeBrokenUtf8 } from '../actions/permissions';
import { cache } from 'react';
import { DEFAULT_ROLES, getDefaultRoles } from './default-roles';

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
 * Returns supabaseAdmin in server runtime to avoid PostgreSQL 42P17 RLS recursion
 * on organization_roles / organization_members, while preserving createClient() mocks in unit tests.
 */
async function getDbClient(authSupabase?: Awaited<ReturnType<typeof createClient>>) {
    if (process.env.VITEST && authSupabase) {
        return authSupabase;
    }
    if (supabaseAdmin && (process.env.SUPABASE_SERVICE_ROLE_KEY || (supabaseAdmin as any).supabaseKey)) {
        return supabaseAdmin;
    }
    return authSupabase || supabaseAdmin;
}

function sanitizeRolePermissions(permissions: unknown): Record<string, boolean> {
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) return {};

    return Object.entries(permissions as Record<string, unknown>).reduce<Record<string, boolean>>((safePermissions, [key, value]) => {
        if (key === 'all') return safePermissions;
        if (typeof value === 'boolean') safePermissions[key] = value;
        return safePermissions;
    }, {});
}

function normalizeCustomRoleHierarchy(hierarchyLevel: unknown, maxAllowed: number = 49) {
    if (typeof hierarchyLevel !== 'number' || !Number.isFinite(hierarchyLevel)) return 10;
    const cap = Math.max(1, Math.min(49, Math.floor(maxAllowed)));
    return Math.max(1, Math.min(cap, Math.floor(hierarchyLevel)));
}

/**
 * Get all roles for the current organization
 * Returns roles sorted by hierarchy level
 */
export async function getOrganizationRoles(): Promise<Role[]> {
    const authSupabase = await createClient();
    const db = await getDbClient(authSupabase);
    const orgId = await getCurrentOrganizationId();
    if (!orgId) return [];

    const { data, error } = await db
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

    return (data || [])
        .map((role: any) => {
            const normalized = normalizeRoleRecord(role);
            return {
                ...normalized,
                member_count: role.members?.[0]?.count || 0
            };
        })
        .sort((a: Role, b: Role) => {
            const diff = (b.hierarchy_level ?? 0) - (a.hierarchy_level ?? 0);
            if (diff !== 0) return diff;
            return (a.name || '').localeCompare(b.name || '');
        });
}

export interface UserPermissionsPayload {
    isOwner: boolean;
    hierarchyLevel: number;
    roleName: string;
    rolePermissions: Record<string, any>;
    memberOverrides: Record<string, any>;
    effectivePermissions: Record<string, any>;
}

function createRequestCache<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    const reactCachedFn = cache(fn);
    const fallbackCache = new Map<string, any>();

    const wrapped = (async (...args: any[]) => {
        if (process.env.VITEST) {
            const key = JSON.stringify(args);
            if (fallbackCache.has(key)) {
                return fallbackCache.get(key);
            }
            const result = await fn(...args);
            fallbackCache.set(key, result);
            return result;
        }
        return reactCachedFn(...args);
    }) as unknown as T;

    return wrapped;
}

// Internal request-level cache keyed strictly by (orgId, targetUserId)
const fetchUserPermissionsPayloadCached = createRequestCache(async (orgId: string, targetUserId: string): Promise<UserPermissionsPayload | null> => {
    const supabase = await createClient();
    const db = await getDbClient(supabase);

    // Query 1: Get the member row
    const { data: member, error } = await db
        .from('organization_members')
        .select('role, role_id, status, permissions')
        .eq('organization_id', orgId)
        .eq('user_id', targetUserId)
        .single();

    if (error || !member) {
        // Fallback for Platform Super Admins who may inspect an org without being in organization_members
        try {
            const superAdmin = await isSuperAdmin(targetUserId);
            if (superAdmin) {
                return {
                    isOwner: true,
                    hierarchyLevel: 100,
                    roleName: 'superadmin',
                    rolePermissions: { all: true } as Record<string, any>,
                    memberOverrides: {} as Record<string, any>,
                    effectivePermissions: { all: true } as Record<string, any>,
                };
            }
        } catch {
            // Ignore in restricted test contexts
        }
        return null;
    }

    if (member.status === 'blocked') return null;

    const memberOverrides = (member.permissions as any) || {};
    const legacyRoleNormalized = sanitizeBrokenUtf8(member.role).toLowerCase();

    // Query 2: Get the role's permissions
    let rolePermissions: Record<string, any> = {};
    let isOwner = legacyRoleNormalized === 'owner' || legacyRoleNormalized === 'dueño';
    let hierarchyLevel = isOwner ? 100 : (legacyRoleNormalized === 'admin' || legacyRoleNormalized === 'administrador' ? 50 : 10);
    let roleName = member.role || (isOwner ? 'Dueño' : 'Miembro');

    if (member.role_id) {
        const { data: roleData } = await db
            .from('organization_roles')
            .select('name, is_system_role, permissions, hierarchy_level')
            .eq('id', member.role_id)
            .eq('organization_id', orgId)
            .single();

        if (roleData) {
            const normalizedRole = normalizeRoleRecord(roleData as any);
            roleName = normalizedRole.name || roleName;
            if (typeof normalizedRole.hierarchy_level === 'number') {
                hierarchyLevel = normalizedRole.hierarchy_level;
            }
            if (normalizedRole.hierarchy_level === 100 || (normalizedRole.permissions as any)?.all === true) {
                isOwner = true;
            }
            rolePermissions = (normalizedRole.permissions as any) || {};
        }
    }

    // System role fallbacks when role_id is null or permissions are empty
    if (isOwner && Object.keys(rolePermissions).length === 0) {
        const defaultOwnerRole = getDefaultRoles().find(r => r.name === 'Dueño');
        if (defaultOwnerRole) {
            rolePermissions = { ...defaultOwnerRole.permissions };
        } else {
            rolePermissions = { all: true };
        }
    } else if (!isOwner && Object.keys(rolePermissions).length === 0) {
        if (legacyRoleNormalized === 'admin' || legacyRoleNormalized === 'administrador') {
            const defaultAdminRole = getDefaultRoles().find(r => r.name === 'Administrador');
            if (defaultAdminRole) {
                rolePermissions = { ...defaultAdminRole.permissions };
                hierarchyLevel = Math.max(hierarchyLevel, defaultAdminRole.hierarchy_level);
            }
        } else if (legacyRoleNormalized === 'member' || legacyRoleNormalized === 'miembro') {
            const defaultMemberRole = getDefaultRoles().find(r => r.name === 'Miembro');
            if (defaultMemberRole) {
                rolePermissions = { ...defaultMemberRole.permissions };
            }
        }
    }

    const effectivePermissions: Record<string, any> = {
        ...rolePermissions,
        ...memberOverrides,
        modules: { ...(rolePermissions?.modules || {}), ...memberOverrides.modules },
        features: { ...(rolePermissions?.features || {}), ...memberOverrides.features },
    };
    if (isOwner) {
        effectivePermissions.all = true;
    }

    return {
        isOwner,
        hierarchyLevel,
        roleName: sanitizeBrokenUtf8(roleName),
        rolePermissions,
        memberOverrides,
        effectivePermissions,
    };
});

/**
 * Resolves context defaults and retrieves the user permissions payload from the request cache.
 */
export async function getUserPermissionsPayload(explicitOrgId?: string, explicitUserId?: string): Promise<UserPermissionsPayload | null> {
    let targetUserId = explicitUserId;

    if (!targetUserId) {
        try {
            const supabase = await createClient();
            if (!supabase?.auth?.getUser) return null;
            const { data } = await supabase.auth.getUser();
            const user = data?.user;
            if (!user) return null;
            targetUserId = user.id;
        } catch {
            return null;
        }
    }

    let orgId = explicitOrgId;
    if (!orgId) {
        try {
            orgId = await getCurrentOrganizationId() ?? undefined;
        } catch {
            return null;
        }
    }
    if (!orgId) return null;

    return fetchUserPermissionsPayloadCached(orgId, targetUserId);
}

export const hasPermission = async (permission: PermissionString, explicitOrgId?: string): Promise<boolean> => {
    const payload = await getUserPermissionsPayload(explicitOrgId);
    if (!payload) return false;

    const { isOwner, rolePermissions, memberOverrides, effectivePermissions } = payload;

    // Wildcard Owner Access
    if (isOwner) return true;
    if (effectivePermissions['all'] === true || rolePermissions['all'] === true || memberOverrides['all'] === true) return true;

    // Explicit Member Override (supports both granting true and revoking false)
    if (typeof memberOverrides[permission] === 'boolean') {
        return memberOverrides[permission];
    }
    if (typeof memberOverrides.features?.[permission] === 'boolean') {
        return memberOverrides.features[permission];
    }

    // Role Default Permission Check
    if (rolePermissions[permission] === true || rolePermissions.features?.[permission] === true) return true;

    // Effective Permissions Check
    if (effectivePermissions[permission] === true || effectivePermissions.features?.[permission] === true) return true;

    return false;
};

export async function requirePermission(permission: PermissionString, explicitOrgId?: string): Promise<void> {
    const allowed = await hasPermission(permission, explicitOrgId);
    if (!allowed) {
        throw new Error(`Acceso denegado: Se requiere el permiso "${permission}".`);
    }
}

/**
 * Create or Update a Custom Role
 */
export async function upsertRole(role: Partial<Role>) {
    const supabase = await createClient();
    const db = await getDbClient(supabase);
    const orgId = await getCurrentOrganizationId();
    if (!orgId) throw new Error('No Organization Context');

    // Security Check: Only those with MANAGE_ROLES can do this
    const canManage = await hasPermission(PERMISSIONS.ORG.MANAGE_ROLES);
    if (!canManage) throw new Error('Unauthorized: Missing MANAGE_ROLES permission');

    const actorPayload = await getUserPermissionsPayload();
    const actorHierarchy = actorPayload?.hierarchyLevel ?? 0;

    // Validation
    if (!role.name || !role.name.trim()) throw new Error('Role name is required');

    // Non-owner actors cannot request a hierarchy level higher than their own
    if (!actorPayload?.isOwner && typeof role.hierarchy_level === 'number' && role.hierarchy_level > actorHierarchy) {
        throw new Error('Cannot assign a hierarchy level higher than your own');
    }

    const payload = {
        organization_id: orgId,
        name: sanitizeBrokenUtf8(role.name).trim(),
        description: role.description != null ? sanitizeBrokenUtf8(role.description) : null,
        permissions: sanitizeRolePermissions(role.permissions),
        hierarchy_level: normalizeCustomRoleHierarchy(role.hierarchy_level, actorHierarchy),
    };

    if (role.id) {
        const { data: existingRole, error: existingRoleError } = await db
            .from('organization_roles')
            .select('name, description, is_system_role, hierarchy_level')
            .eq('id', role.id)
            .eq('organization_id', orgId)
            .single();

        if (existingRoleError || !existingRole) throw new Error('Role not found');
        
        if (existingRole.is_system_role) throw new Error('Cannot modify a System Role');

        if (!actorPayload?.isOwner && (existingRole.hierarchy_level ?? 0) > actorHierarchy) {
            throw new Error('Insufficient hierarchy level to modify this role');
        }

        const { data: updatedRole, error } = await db
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
        const { data: newRole, error } = await db
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
    const db = await getDbClient(supabase);
    const orgId = await getCurrentOrganizationId();
    if (!orgId) throw new Error('No Organization Context');

    const canManage = await hasPermission(PERMISSIONS.ORG.MANAGE_ROLES);
    if (!canManage) throw new Error('Unauthorized');

    const actorPayload = await getUserPermissionsPayload();
    const actorHierarchy = actorPayload?.hierarchyLevel ?? 0;

    const { data: role } = await db
        .from('organization_roles')
        .select('is_system_role, hierarchy_level, name')
        .eq('id', roleId)
        .eq('organization_id', orgId)
        .single();

    if (!role) throw new Error('Role not found');
    if (role.is_system_role) throw new Error('Cannot delete a System Role');
    if (!actorPayload?.isOwner && (role.hierarchy_level ?? 0) > actorHierarchy) {
        throw new Error('Insufficient hierarchy level to delete this role');
    }

    // Prevent deleting a role that currently has members assigned
    const { count: assignedCount } = await db
        .from('organization_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('role_id', roleId);

    if ((assignedCount ?? 0) > 0) {
        throw new Error(`No se puede eliminar el rol "${role.name}" porque tiene ${assignedCount} miembro(s) asignado(s). Reasígnalos a otro rol primero.`);
    }

    const { error } = await db
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
    const db = await getDbClient(supabase);

    const roles = getDefaultRoles().map(role => ({ ...role, organization_id: orgId }));

    const { error } = await db
        .from('organization_roles')
        .insert(roles);

    if (error) {
        console.error('Failed to seed roles:', error);
        throw error;
    }

    return { success: true };
}

export const createRole = upsertRole;
export const updateRole = upsertRole;

export async function duplicateRole(roleId: string, customName?: string) {
    const supabase = await createClient();
    const db = await getDbClient(supabase);
    const orgId = await getCurrentOrganizationId();
    if (!orgId) throw new Error('No Organization Context');

    const canManage = await hasPermission(PERMISSIONS.ORG.MANAGE_ROLES);
    if (!canManage) throw new Error('Unauthorized: Missing MANAGE_ROLES permission');

    const { data: sourceRole, error } = await db
        .from('organization_roles')
        .select('*')
        .eq('id', roleId)
        .eq('organization_id', orgId)
        .single();

    if (error || !sourceRole) throw new Error('Role not found');

    const normalizedSource = normalizeRoleRecord(sourceRole);
    const isOwnerKind =
        resolveSystemRoleKind(sourceRole) === 'owner' ||
        sourceRole.permissions?.all === true ||
        (sourceRole.hierarchy_level ?? 0) >= 100;

    let clonedPermissions: Record<string, boolean> = {};
    if (isOwnerKind) {
        for (const g of PERMISSION_GROUPS) {
            for (const p of g.permissions) {
                clonedPermissions[p.id] = true;
            }
        }
    } else {
        clonedPermissions = { ...(normalizedSource.permissions || {}) };
        delete clonedPermissions.all;
    }

    return upsertRole({
        name: customName || `${normalizedSource.name} (Personalizado)`,
        description: normalizedSource.description ? `Copia personalizada: ${normalizedSource.description}` : null,
        hierarchy_level: Math.min(45, normalizedSource.hierarchy_level || 10),
        permissions: clonedPermissions,
        is_system_role: false,
    });
}

