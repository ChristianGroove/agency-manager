"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { requireSuperAdmin } from "@/lib/auth/platform-roles"
import { revalidatePath } from "next/cache"

export interface AdminOrganization {
    id: string
    name: string
    slug: string
    status: string
    subscription_status?: string
    owner_id?: string
    created_at: string
    next_billing_date?: string
    base_app_slug?: string
    suspended_at?: string
    suspended_reason?: string
}

/**
 * Get all organizations - SUPER ADMIN ONLY
 */
export async function getAdminOrganizations(): Promise<AdminOrganization[]> {
    await requireSuperAdmin()

    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select(`
            id,
            name,
            slug,
            status,
            subscription_status,
            owner_id,
            created_at,
            next_billing_date,
            base_app_slug,
            suspended_at,
            suspended_reason
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[getAdminOrganizations] Error:', error)
        throw new Error('Failed to fetch organizations')
    }

    return data || []
}

/**
 * Get organization details with statistics
 */
export async function getOrganizationDetails(orgId: string) {
    await requireSuperAdmin()

    // Get organization
    const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

    if (orgError) throw orgError

    // Get user count
    const { count: userCount } = await supabaseAdmin
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

    // Get client count
    const { count: clientCount } = await supabaseAdmin
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

    return {
        organization: org,
        stats: {
            users: userCount || 0,
            clients: clientCount || 0
        }
    }
}

/**
 * Update organization status
 */
export async function updateOrganizationStatus(
    orgId: string,
    status: 'active' | 'suspended' | 'past_due' | 'archived',
    reason?: string
) {
    await requireSuperAdmin()

    // Note: Admin client doesn't have auth.getUser(), we'll need to get from regular client
    let userId = 'system'
    try {
        const { createClient } = await import("@/lib/supabase-server")
        const regularClient = await createClient()
        const { data: { user } } = await regularClient.auth.getUser()
        if (user) userId = user.id
    } catch (e) {
        console.warn('Failed to get current user for audit log:', e)
    }

    // Update Organization
    const { error } = await supabaseAdmin
        .from('organizations')
        .update({
            status,
            suspended_at: status === 'suspended' ? new Date().toISOString() : null,
            suspended_reason: status === 'suspended' ? reason : null
        })
        .eq('id', orgId)

    if (error) {
        console.error('[updateOrganizationStatus] Update Error:', error)
        throw new Error(`Failed to update organization status: ${error.message}`)
    }

    // Create audit log if audit table exists
    try {
        const { error: auditError } = await supabaseAdmin.from('organization_audit_log').insert({
            organization_id: orgId,
            action: status === 'suspended' ? 'suspended' : 'activated',
            performed_by: userId,
            details: { status, reason }
        })
        if (auditError) console.error('[updateOrganizationStatus] Audit Error:', auditError)
    } catch (auditError) {
        // Audit log table might not exist yet, that's okay
        console.log('[updateOrganizationStatus] Audit log skipped/failed:', auditError)
    }

    revalidatePath('/platform/admin')
    revalidatePath('/platform/admin/organizations')

    return { success: true }
}

/**
 * Get organization users
 */
export async function getOrganizationUsers(orgId: string) {
    await requireSuperAdmin()

    const { data: members, error } = await supabaseAdmin
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)

    if (error) throw error
    if (!members?.length) return []

    // Fetch user details directly from Auth Admin API to ensure accuracy
    // Profiles table might be out of sync or missing
    const userIds = members.map(m => m.user_id)
    const userMap = new Map<string, { email: string }>()

    // Parallel fetch for speed
    await Promise.all(userIds.map(async (uid) => {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(uid)
        if (user) {
            userMap.set(uid, { email: user.email || 'No Email' })
        }
    }))

    // Also fetch profiles for platform_role
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, platform_role')
        .in('id', userIds)

    return members.map(member => {
        const authUser = userMap.get(member.user_id)
        const profile = profiles?.find(p => p.id === member.user_id)

        return {
            ...member,
            user: {
                email: authUser?.email || 'Unknown (User Not Found in Auth)',
                platform_role: profile?.platform_role || 'user'
            }
        }
    })
}
