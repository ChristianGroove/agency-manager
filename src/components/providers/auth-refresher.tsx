"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/modules/core/database/supabase"
import { toast } from "sonner"

/**
 * AuthRefresher - Monitors Supabase Auth State
 * 
 * - Ensures all tabs stay in sync via multiTab: true (lib/supabase.ts)
 * - Detects token refreshes and notifies the user if needed
 * - Forces a clean redirect on sign-out to prevent "zombie" UI states
 */
export function AuthRefresher() {
    const router = useRouter()

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`[AUTH] Event: ${event}`, session?.user?.email)

            if (event === 'SIGNED_OUT') {
                // Force a clean state on sign out
                router.refresh()
                router.push('/login')
            }

            if (event === 'TOKEN_REFRESHED') {
                // Token was successfully rotated, system continues normally
                console.log("[AUTH] Session token refreshed successfully")
            }

            if (event === 'USER_UPDATED') {
                // Sync UI cache
                router.refresh()
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router])

    return null
}
