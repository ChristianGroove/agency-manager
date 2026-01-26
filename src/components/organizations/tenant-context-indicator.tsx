"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Building2 } from "lucide-react"

import { getCurrentOrgName } from "@/modules/core/organizations/actions"

export function TenantContextIndicator() {
    const [orgName, setOrgName] = useState<string | null>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        async function fetchOrg() {
            // Get Org ID from cookie or user metadata logic?
            // Client-side, we can just fetch the active one if we assume the cookie is set.
            // But we don't have easy access to cookies in client components directly without a server prop.
            // However, we can use the `getUserOrganizations` or similar action, OR just check the sidebar context if passed.
            // Better: Component should probably accept `orgName` as prop or use a Context.

            // For now, let's fetch 'current' from the server action wrapper or relying on the cookie being there for general requests.
            // Actually, we can just use the provided actions BUT they are async.

            // Simplest robust way: 
            // We can infer it from the profile/session or just fetch `getCurrentOrgName`.
            // Let's rely on a small client-side fetch since we want this to be dynamic.
            try {
                // Get Org ID from cookie via server action bridge? 
                // Or just fetch `getCurrentOrganizationId` action?
                const name = await getCurrentOrgName()
                if (name) {
                    setOrgName(name)
                    setIsVisible(true)
                }
            } catch (e) {
                // Silect fail
            }
        }

        fetchOrg()
    }, [])

    if (!isVisible || !orgName) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-none">
            <div className="
                flex items-center gap-2 
                px-4 py-2 
                rounded-full 
                bg-brand-dark/80 dark:bg-white/10 
                backdrop-blur-md 
                border border-white/10 dark:border-white/20
                shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                text-white 
            ">
                <Building2 className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs font-medium tracking-wide">
                    Gestionando: <span className="font-bold text-white">{orgName}</span>
                </span>
            </div>
        </div>
    )
}
