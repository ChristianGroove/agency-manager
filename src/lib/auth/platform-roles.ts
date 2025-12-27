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
        return role === 'super_admin'
    } catch (error) {
        console.error('[isSuperAdmin] Error:', error)
        return false
    }
}

/**
 * Check if user has support role
 */
export async function isSupport(userId?: string): Promise<boolean> {
    try {
        const role = await getUserPlatformRole(userId)
        return role === 'support' || role === 'super_admin'
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
