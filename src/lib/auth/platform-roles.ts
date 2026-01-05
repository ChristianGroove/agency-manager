"use server"

import { createClient } from "@/lib/supabase-server"
import { cache } from "react"

export type PlatformRole = 'user' | 'super_admin' | 'support'

/**
 * Get user's platform role from profiles table
 * Cached per request for performance
 */
export const getUserPlatformRole = cache(async (userId?: string): Promise<PlatformRole> => {
    const supabase = await createClient()

    // Get user ID if not provided
    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return 'user'
        userId = user.id
    }

    // Query profiles table for platform_role
    const { data, error } = await supabase
        .from('profiles')
        .select('platform_role')
        .eq('id', userId)
        .maybeSingle()


    // If profile doesn't exist, try to create it
    if (!data && !error) {
        try {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({ id: userId, platform_role: 'user' })

            if (insertError) {
                console.error('[getUserPlatformRole] Failed to create profile:', insertError)
            }
            return 'user'
        } catch (err) {
            console.error('[getUserPlatformRole] Insert exception:', err)
            return 'user'
        }
    }

    if (error || !data) {
        console.error('[getUserPlatformRole] Error:', error)
        return 'user'
    }

    return (data.platform_role as PlatformRole) || 'user'
})

/**
 * Check if user is super admin
 * @param userId - Optional user ID, defaults to current user
 */
export async function isSuperAdmin(userId?: string): Promise<boolean> {
    try {
        const role = await getUserPlatformRole(userId)
        if (role === 'super_admin') return true

        // Fallback: Check if user is the owner of the "Tenant Zero" (First Organization)
        // This ensures the product owner always has access even if profile is not set
        return await isTenantZeroOwner(userId)
    } catch (error) {
        console.error('[isSuperAdmin] Error:', error)
        return false
    }
}

/**
 * Check if user is the owner of the first created organization
 */
const isTenantZeroOwner = cache(async (userId?: string): Promise<boolean> => {
    const supabase = await createClient()
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id
    if (!targetUserId) return false

    // Find the oldest organization
    const { data: oldestOrg } = await supabase
        .from('organizations')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    if (!oldestOrg) return false

    // Check if user is owner of that org
    const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .match({ organization_id: oldestOrg.id, user_id: targetUserId, role: 'owner' })
        .maybeSingle()

    return !!member
})

/**
 * Check if user has support role
 */
export async function isSupport(userId?: string): Promise<boolean> {
    try {
        const role = await getUserPlatformRole(userId)
        if (role === 'support' || role === 'super_admin') return true

        return await isTenantZeroOwner(userId)
    } catch (error) {
        console.error('[isSupport] Error:', error)
        return false
    }
}

/**
 * Require super admin access - throws if not authorized
 * Use in server actions and route handlers
 */
export async function requireSuperAdmin(): Promise<void> {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        throw new Error("Unauthorized: Super admin access required")
    }
}

/**
 * Get current user's platform role
 * Convenience function for client components (via server action)
 */
export async function getCurrentUserRole(): Promise<PlatformRole> {
    return await getUserPlatformRole()
}
