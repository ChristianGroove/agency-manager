"use server"

import { createClient } from "@/lib/supabase-server"
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

    const supabase = await createClient()
    const { data, error } = await supabase
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

    const supabase = await createClient()

    // Get organization
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

    if (orgError) throw orgError

    // Get user count
    const { count: userCount } = await supabase
        .from('organization_users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

    // Get client count
    const { count: clientCount } = await supabase
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

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
        .from('organizations')
        .update({
            status,
            suspended_at: status === 'suspended' ? new Date().toISOString() : null,
            suspended_reason: status === 'suspended' ? reason : null,
            updated_at: new Date().toISOString()
        })
        .eq('id', orgId)

    if (error) {
        console.error('[updateOrganizationStatus] Error:', error)
        throw new Error('Failed to update organization status')
    }

    // Create audit log if audit table exists
    try {
        await supabase.from('organization_audit_log').insert({
            organization_id: orgId,
            action: status === 'suspended' ? 'suspended' : 'activated',
            performed_by: user!.id,
            details: { status, reason }
        })
    } catch (auditError) {
        // Audit log table might not exist yet, that's okay
        console.log('[updateOrganizationStatus] Audit log not available')
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

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('organization_users')
        .select(`
            id,
            role,
            joined_at,
            user:users(email)
        `)
        .eq('organization_id', orgId)
        .order('joined_at', { ascending: false })

    if (error) throw error
    return data || []
}
