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

    const { data } = await supabase
        .from('organization_members')
        .select(`
            role,
            role_id,
            role_data:organization_roles (
                name
            )
        `)
        .match({ organization_id: orgId, user_id: user.id })
        .maybeSingle()

    if (!data) return null;

    // Mapping Logic:
    // 1. If it's explicitly 'owner' or 'admin' in the legacy column, use it.
    if (data.role === 'owner' || data.role === 'admin') return data.role;

    // 2. If it's 'member' (likely a dynamic role holder), check the role name
    const dynamicRoleName = (data.role_data as any)?.name?.toLowerCase() || '';
    if (dynamicRoleName.includes('owner') || dynamicRoleName.includes('dueño')) return 'owner';
    if (dynamicRoleName.includes('admin') || dynamicRoleName.includes('administrador')) return 'admin';

    // 3. Fallback to legacy field
    return (data.role as OrganizationRole) || 'member';
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

