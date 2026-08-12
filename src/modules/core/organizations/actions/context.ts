"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { isSuperAdmin } from "@/modules/core/iam/services/platform-roles"
import { getUserOrganizations } from "./crud"

const PUBLIC_LIMITS_UPDATE_ERROR = "No se pudieron actualizar los limites"
const LIMITS_PERMISSION_ERROR = "No tienes permiso para gestionar limites de esta organizacion."

/**
 * Switch the active organization context.
 * Supports direct membership, hierarchical Reseller→Child access, and SuperAdmin bypass.
 */
export async function switchOrganization(organizationId: string) {
    const cookieStore = await cookies()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    // 1. Check direct membership
    const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .neq('status', 'blocked')
        .single()

    if (!member) {
        // 2. Check hierarchical access: Reseller (parent) → Child tenant
        let hasHierarchicalAccess = false

        const { data: targetOrg } = await supabase
            .from('organizations')
            .select('parent_organization_id')
            .eq('id', organizationId)
            .single()

        if (targetOrg?.parent_organization_id) {
            const { data: parentMembership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('organization_id', targetOrg.parent_organization_id)
                .eq('user_id', user.id)
                .neq('status', 'blocked')
                .single()

            if (parentMembership && ['owner', 'admin'].includes(parentMembership.role)) {
                hasHierarchicalAccess = true
            }
        }

        // 3. SuperAdmin bypass (consistent with getCurrentOrganizationId)
        if (!hasHierarchicalAccess) {
            hasHierarchicalAccess = await isSuperAdmin(user.id)
        }

        if (!hasHierarchicalAccess) {
            throw new Error("User is not a member of this organization")
        }
    }

    cookieStore.set('pixy_org_id', organizationId, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30
    })

    revalidatePath('/')
}

/**
 * Update organization usage limits (Reseller/Platform)
 */
export async function updateOrganizationLimits(organizationId: string, limits: { engine: string, period: 'day' | 'month', limit: number }[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: targetOrg } = await (await createClient())
        .from('organizations')
        .select('parent_organization_id')
        .eq('id', organizationId)
        .single()

    if (!targetOrg) return { success: false, error: LIMITS_PERMISSION_ERROR }

    let canManageLimits = await isSuperAdmin(user.id)

    if (!canManageLimits && !targetOrg.parent_organization_id) {
        const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', organizationId)
            .eq('user_id', user.id)
            .single()

        canManageLimits = !!membership && ['owner', 'admin'].includes(membership.role)
    }

    if (!canManageLimits && targetOrg?.parent_organization_id) {
        const { data: parentMembership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', targetOrg.parent_organization_id)
            .eq('user_id', user.id)
            .single()

        if (!parentMembership || !['owner', 'admin'].includes(parentMembership.role)) {
            return { success: false, error: "No tienes permiso para gestionar límites de esta organización." }
        }
    }

    if (!canManageLimits && targetOrg.parent_organization_id) {
        canManageLimits = true
    }

    if (!canManageLimits) {
        return { success: false, error: LIMITS_PERMISSION_ERROR }
    }

    const rows = limits.map(l => ({
        organization_id: organizationId,
        engine: l.engine,
        period: l.period,
        limit_value: l.limit
    }))

    const { error } = await (await createClient())
        .from('usage_limits')
        .upsert(rows)

    if (error) {
        console.error("Error updating limits:", error)
        return { success: false, error: PUBLIC_LIMITS_UPDATE_ERROR }
    }

    revalidatePath('/platform/organizations')
    return { success: true }
}

/**
 * Get organization usage limits
 */
export async function getOrganizationLimits(organizationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: targetOrg } = await (await createClient())
        .from('organizations')
        .select('parent_organization_id')
        .eq('id', organizationId)
        .single()

    let hasAccess = false

    if (targetOrg?.parent_organization_id) {
        const { data: parentMembership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', targetOrg.parent_organization_id)
            .eq('user_id', user.id)
            .single()
        if (parentMembership && ['owner', 'admin'].includes(parentMembership.role)) hasAccess = true
    } else {
        const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', organizationId)
            .eq('user_id', user.id)
            .single()
        if (membership) hasAccess = true
    }

    if (!hasAccess) {
        return []
    }

    const { data } = await (await createClient())
        .from('usage_limits')
        .select('*')
        .eq('organization_id', organizationId)

    return data || []
}
