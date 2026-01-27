"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Building2 } from "lucide-react"

import { getCurrentOrgName, getTenantContext } from "@/modules/core/organizations/actions"

export function TenantContextIndicator() {
    const [context, setContext] = useState<{ name: string, color: string } | null>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        async function fetchContext() {
            try {
                // Fetch context (visibility logic is server-side)
                const data = await getTenantContext()

                if (data) {
                    setContext(data)
                    setIsVisible(true)
                } else {
                    setIsVisible(false)
                }
            } catch (e) {
                // Silent fail
            }
        }

        fetchContext()
    }, [])

    if (!isVisible || !context) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-none">
            <div
                className="
                    flex items-center gap-2 
                    px-4 py-2 
                    rounded-full 
                    backdrop-blur-md 
                    border border-white/20
                    shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                    text-white 
                "
                style={{ backgroundColor: context.color ? `${context.color}CC` : 'rgba(0,0,0,0.8)' }}
            >
                <Building2 className="w-3.5 h-3.5 text-white/90" />
                <span className="text-xs font-medium tracking-wide">
                    Gestionando: <span className="font-bold text-white">{context.name}</span>
                </span>
            </div>
        </div>
    )
}
