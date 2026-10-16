"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { isSuperAdmin } from "@/modules/core/iam/services/platform-roles"
import { cache } from "react"

export type OrganizationRole = 'owner' | 'admin' | 'member'

const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
    'owner': 3,
    'admin': 2,
    'member': 1
}

/**
 * Get current user's role in the active organization
 * Super Admins are always treated as 'owner' for access purposes
 */
export const getCurrentOrgRole = cache(async (providedOrgId?: string | null): Promise<OrganizationRole | null> => {
    const orgId = providedOrgId || await getCurrentOrganizationId()
    if (!orgId) return null

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Super Admins (including Tenant Zero owner) always have 'owner' access
    const isAdmin = await isSuperAdmin(user.id)
    if (isAdmin) return 'owner'

    const db = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV !== 'test' && !process.env.VITEST)
        ? (await import('@/modules/core/database/supabase-admin')).supabaseAdmin
        : supabase

    const { data, error } = await db
        .from('organization_members')
        .select(`
            role,
            role_id,
            status,
            permissions,
            role_data:organization_roles (
                name,
                hierarchy_level,
                permissions
            )
        `)
        .match({ organization_id: orgId, user_id: user.id })
        .maybeSingle()

    if (error) {
        console.error("Error fetching org role:", error)
        return null;
    }

    if (!data || data.status === 'blocked') return null;

    const roleData = data.role_data as any;
    const dynamicRoleName = roleData?.name?.toLowerCase() || '';
    const hierarchyLevel = typeof roleData?.hierarchy_level === 'number' ? roleData.hierarchy_level : 0;
    const rolePerms = (roleData?.permissions as Record<string, any>) || {};
    const memberPerms = (data.permissions as Record<string, any>) || {};

    // Mapping Logic:
    // 1. Owner checks (legacy column, hierarchy >= 100, wildcard permission, or role name)
    if (
        data.role === 'owner' ||
        data.role === 'dueño' ||
        hierarchyLevel >= 100 ||
        rolePerms.all === true ||
        memberPerms.all === true ||
        dynamicRoleName.includes('owner') ||
        dynamicRoleName.includes('dueño')
    ) {
        return 'owner';
    }

    // 2. Admin / Administrative custom role checks (legacy column, hierarchy >= 50, role name, or settings permission)
    if (
        data.role === 'admin' ||
        data.role === 'administrador' ||
        hierarchyLevel >= 50 ||
        dynamicRoleName.includes('admin') ||
        dynamicRoleName.includes('administrador') ||
        rolePerms['org.settings.manage'] === true ||
        memberPerms['org.settings.manage'] === true
    ) {
        return 'admin';
    }

    // 3. Fallback to member
    return 'member';
})

/**
 * Check if current user has at least the required role
 */
export async function hasRole(requiredRole: OrganizationRole): Promise<boolean> {
    const currentRole = await getCurrentOrgRole()
    if (!currentRole) return false

    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Require a specific role constraint (Throws Error)
 * Use in Server Actions
 */
export async function requireOrgRole(requiredRole: OrganizationRole) {
    const hasPermission = await hasRole(requiredRole)
    if (!hasPermission) {
        throw new Error(`Unauthorized: Requires ${requiredRole} role`)
    }
}

