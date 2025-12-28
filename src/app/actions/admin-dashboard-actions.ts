"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { requireSuperAdmin } from "@/lib/auth/platform-roles"
import { revalidatePath } from "next/cache"

/**
 * Get aggregated stats for the Command Center
 */
export async function getAdminDashboardStats() {
    await requireSuperAdmin()

    // Parallel fetch for simplified stats
    const [
        { count: orgCount },
        { count: userCount },
        { count: alertCount },
        { data: recentLogs }
    ] = await Promise.all([
        supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }), // Approximation user count via profiles
        supabaseAdmin.from('system_alerts').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabaseAdmin.from('organization_audit_log').select('*').order('created_at', { ascending: false }).limit(10)
    ])

    return {
        totalOrgs: orgCount || 0,
        totalUsers: userCount || 0,
        activeAlerts: alertCount || 0,
        recentLogs: recentLogs || []
    }
}

/**
 * System Broadcasts
 */
export async function createSystemBroadcast(data: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    expires_at?: string;
}) {
    await requireSuperAdmin()

    const { error } = await supabaseAdmin.from('system_alerts').insert({
        ...data,
        is_active: true
    })

    if (error) throw new Error("Failed to create alert: " + error.message)
    revalidatePath('/')
    return { success: true }
}

export async function stopBroadcast(alertId: string) {
    await requireSuperAdmin()
    const { error } = await supabaseAdmin.from('system_alerts').update({ is_active: false }).eq('id', alertId)
    if (error) throw error
    revalidatePath('/')
}

export async function getActiveBroadcasts() {
    // Public action (cached/optimized ideally)
    const { data } = await supabaseAdmin
        .from('system_alerts')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

    return data || []
}

/**
 * Feature Flags / Module Overrides
 */
export async function updateOrgModuleOverrides(orgId: string, modules: string[]) {
    await requireSuperAdmin()

    const { error } = await supabaseAdmin
        .from('organizations')
        .update({ manual_module_overrides: modules })
        .eq('id', orgId)

    if (error) throw error
    revalidatePath(`/platform/admin/organizations/${orgId}`)
    return { success: true }
}

/**
 * Security
 */
export async function forceLogoutUser(userId: string) {
    await requireSuperAdmin()

    const { error } = await supabaseAdmin.auth.admin.signOut(userId)
    if (error) throw new Error("Failed to sign out user: " + error.message)

    return { success: true }
}

export async function getAllSystemModules() {
    await requireSuperAdmin()
    const { data } = await supabaseAdmin.from('system_modules').select('*').order('category')
    return data || []
}

export async function getOrgManagerData(orgId: string) {
    await requireSuperAdmin()

    // Import other actions to reuse logic (avoid circular dependencies if possible, or just call database directly)
    // To avoid circular refs with admin-actions.ts, I'll use supabaseAdmin directly here as done in stats.

    // 1. Organization Details
    const { data: org, error: orgError } = await supabaseAdmin.from('organizations').select('*').eq('id', orgId).single()
    if (orgError) throw orgError

    // 2. Organization Users (Reusing logic from admin-actions.ts effectively via direct query for speed/simplicity in this aggregation)
    const { data: members } = await supabaseAdmin.from('organization_members').select('*').eq('organization_id', orgId)

    let richUsers: any[] = []
    if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id)

        // Fetch Emails
        const userMap = new Map<string, string>()
        await Promise.all(userIds.map(async (uid) => {
            const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(uid)
            if (user) userMap.set(uid, user.email || 'No Email')
        }))

        // Fetch Profiles
        const { data: profiles } = await supabaseAdmin.from('profiles').select('id, platform_role').in('id', userIds)

        richUsers = members.map(member => {
            const email = userMap.get(member.user_id)
            const profile = profiles?.find(p => p.id === member.user_id)
            return {
                ...member,
                user: {
                    email: email || 'Unknown',
                    platform_role: profile?.platform_role || 'user'
                }
            }
        })
    }

    // 3. Stats
    const { count: clientCount } = await supabaseAdmin.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)

    return {
        organization: org,
        users: richUsers,
        stats: {
            users: richUsers.length,
            clients: clientCount || 0
        }
    }
}
