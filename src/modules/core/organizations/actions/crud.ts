"use server"

import { OrganizationMember } from "@/types/organization"
import { cookies } from "next/headers"
import { createClient } from "@/modules/core/database/supabase-server"

import { cache } from "react"


/**
 * Fetch organizations with Server-Side Pagination & Search
 * Optimized for large datasets.
 */
export async function getOrganizationsPaginated(params: {
    page?: number,
    limit?: number,
    search?: string,
    type?: string,
    parentId?: string
}) {
    // 1. Auth & Context
    const currentOrgId = await getCurrentOrganizationId()

    if (!currentOrgId) return { data: [], count: 0 }

    // Check Role (Must be Reseller or Platform to list orgs generally)
    const { data: currentOrg } = await (await createClient())
        .from('organizations')
        .select('organization_type')
        .eq('id', currentOrgId)
        .single()

    const isPlatform = currentOrg?.organization_type === 'platform'
    const isReseller = currentOrg?.organization_type === 'reseller'

    if (!isPlatform && !isReseller) {
        return { data: [], count: 0, error: "Unauthorized" }
    }

    // 2. Build Query
    const page = params.page || 1
    const limit = params.limit || 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = (await createClient())
        .from('organizations')
        .select(`
            *,
            parent_organization:organizations!parent_organization_id(name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

    // 3. Filters
    if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,slug.ilike.%${params.search}%`)
    }

    if (params.type && params.type !== 'all') {
        query = query.eq('organization_type', params.type)
    }

    // Reseller Constraint: Only show own children
    if (isReseller) {
        query = query.eq('parent_organization_id', currentOrgId)
    } else if (params.parentId) {
        // Platform can filter by parent
        query = query.eq('parent_organization_id', params.parentId)
    }

    // 4. Execute
    const { data, count, error } = await query.range(from, to)

    if (error) {
        console.error("Error fetching organizations:", error)
        return { data: [], count: 0, error: error.message }
    }

    return { data, count }
}

/**
 * Fetch all organizations the current user belongs to.
 */
export async function getUserOrganizations() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('organization_members')
        .select(`
            *,
            organization:organizations (
                *
            )
        `)
        .eq('user_id', user.id)
        .neq('status', 'blocked')

    if (error) {
        console.error("Error fetching user organizations:", error)
        return []
    }

    return data as OrganizationMember[]
}

/**
 * Get the current active organization ID from cookies or default to the first one available.
 */
export const getCurrentOrganizationId = cache(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const cookieStore = await cookies()
    const orgCookie = cookieStore.get('pixy_org_id')

    if (orgCookie?.value) {
        const { data: membership } = await (await createClient())
            .from('organization_members')
            .select('organization_id')
            .eq('organization_id', orgCookie.value)
            .eq('user_id', user.id)
            .neq('status', 'blocked')
            .maybeSingle()

        if (membership) {
            return orgCookie.value
        }

        const { isSuperAdmin } = await import("@/modules/core/iam/services/platform-roles")
        if (await isSuperAdmin(user.id)) {
            console.log(`[ORG_CONTEXT] 🛡️ SuperAdmin Overpass: ${orgCookie.value} for User ${user.id}`);
            return orgCookie.value
        }

        console.warn(`[ORG_CONTEXT] ❌ Security check failed for ${orgCookie.value} (User ${user.id}). Reverting to default.`);
    }

    const orgs = await getUserOrganizations()
    if (orgs.length > 0) {
        return orgs[0].organization_id
    }

    return null
})

/**
 * Get current organization name
 */
export async function getCurrentOrgName() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const supabase = await createClient()
    const { data } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single()

    return data?.name || null
}

/**
 * Internal: Fetch org details using admin client (Cacheable)
 */
async function _getOrgDetailsInternal(orgId: string) {
    const { data } = await (await createClient())
        .from('organizations')
        .select(`
            *,
            active_app:saas_apps!active_app_id (*)
        `)
        .eq('id', orgId)
        .single()
    return data
}

/**
 * PERF: Cached version of Org Details (5 minutes TTL)
 */
export const getCachedOrgDetails = cache(
    async (orgId: string) => _getOrgDetailsInternal(orgId)
)

/**
 * Get full details of current organization
 */
export async function getCurrentOrgDetails(orgId?: string) {
    const activeOrgId = orgId || await getCurrentOrganizationId()
    if (!activeOrgId) return null

    return getCachedOrgDetails(activeOrgId)
}

/**
 * Get the billing profile for an organization
 */
export async function getOrganizationBillingProfile(orgId: string) {
    const { data, error } = await (await createClient())
        .from('organization_billing_profiles')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()

    if (error) {
        console.error("Error fetching billing profile:", error)
        return null
    }

    return data
}

/**
 * Get details for the Sidebar Organization Card
 */
export async function getOrganizationCardDetails(orgId: string | null) {
    if (!orgId) return null

    const [branding, orgResult, saasSubResult] = await Promise.all([
        import("@/modules/core/branding/actions").then(m => m.getEffectiveBranding(orgId)),
        (await createClient())
            .from('organizations')
            .select(`
                organization_type,
                subscription_status,
                allow_direct_billing,
                subscription_product:saas_products!subscription_product_id (name),
                active_app:saas_apps!active_app_id (name)
            `)
            .eq('id', orgId)
            .single(),
        (await createClient())
            .from('saas_subscriptions')
            .select(`
                status,
                plan:saas_apps(name)
            `)
            .eq('organization_id', orgId)
            .maybeSingle()
    ])

    const org = orgResult.data
    const saasSub = saasSubResult.data

    const subProduct = org?.subscription_product as any
    const activeApp = org?.active_app as any
    const legacySubName = Array.isArray(subProduct) ? subProduct[0]?.name : subProduct?.name
    const appName = Array.isArray(activeApp) ? activeApp[0]?.name : activeApp?.name
    const saasPlanName = saasSub?.plan ? (Array.isArray(saasSub.plan) ? (saasSub.plan[0] as any)?.name : (saasSub.plan as any)?.name) : null

    const planName = saasPlanName || legacySubName || appName || "Plan Gratuito"

    const statusMap: Record<string, string> = {
        'active': 'Activo',
        'legacy_manual': 'Legacy',
        'trialing': 'Prueba',
        'past_due': 'Vencido',
        'canceled': 'Cancelado',
        'incomplete': 'Incompleto'
    }

    const currentStatus = saasSub?.status || org?.subscription_status || ''
    const statusLabel = statusMap[currentStatus] || 'Desconocido'

    return {
        branding,
        subscription: {
            planName,
            status: currentStatus,
            statusLabel
        },
        type: org?.organization_type || 'client',
        allowDirectBilling: org?.allow_direct_billing
    }
}

/**
 * Delete organizations
 */
export async function deleteOrganizations(ids: string[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
    if (uniqueIds.length === 0) return { success: true }

    const memberships = await getUserOrganizations()
    const privilegedMemberships = memberships.filter(m =>
        ['platform', 'reseller'].includes(m.organization?.organization_type || '') &&
        ['owner', 'admin'].includes(m.role)
    )
    const hasPlatformAccess = privilegedMemberships.some(m => m.organization?.organization_type === 'platform')
    const resellerOrgIds = privilegedMemberships
        .filter(m => m.organization?.organization_type === 'reseller')
        .map(m => m.organization_id)

    if (!hasPlatformAccess && resellerOrgIds.length === 0) {
        return { success: false, error: "No tienes permisos suficientes para eliminar organizaciones." }
    }

    if (!hasPlatformAccess) {
        const { data: targetOrganizations, error: targetError } = await (await createClient())
            .from('organizations')
            .select('id, parent_organization_id')
            .in('id', uniqueIds)

        if (targetError) {
            console.error("Error validating organizations for deletion:", targetError)
            return { success: false, error: targetError.message }
        }

        const targetIds = new Set((targetOrganizations || []).map(org => org.id))
        const hasOutsideScope = uniqueIds.some(id => !targetIds.has(id)) ||
            (targetOrganizations || []).some(org => !resellerOrgIds.includes(org.parent_organization_id))

        if (hasOutsideScope) {
            return { success: false, error: "No tienes permisos suficientes para eliminar organizaciones." }
        }
    }

    let deleteQuery = (await createClient())
        .from('organizations')
        .delete()
        .in('id', uniqueIds)

    if (!hasPlatformAccess) {
        deleteQuery = deleteQuery.in('parent_organization_id', resellerOrgIds)
    }

    const { error } = await deleteQuery

    if (error) {
        console.error("Error deleting organizations:", error)
        return { success: false, error: error.message }
    }

    const { revalidatePath } = await import("next/cache")
    revalidatePath('/platform/organizations')
    return { success: true }
}
