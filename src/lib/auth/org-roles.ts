"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { isSuperAdmin } from "@/lib/auth/platform-roles"
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
export const getCurrentOrgRole = cache(async (): Promise<OrganizationRole | null> => {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Super Admins (including Tenant Zero owner) always have 'owner' access
    const isAdmin = await isSuperAdmin(user.id)
    if (isAdmin) return 'owner'

    const { data } = await supabase
        .from('organization_members')
        .select('role')
        .match({ organization_id: orgId, user_id: user.id })
        .single()

    return (data?.role as OrganizationRole) || null
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
