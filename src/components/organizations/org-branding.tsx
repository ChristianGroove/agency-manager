"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr" // Keep if needed or remove unused
import { Building2 } from "lucide-react"
import { getEffectiveBranding } from "@/modules/core/branding/actions"

export function OrgBranding({ orgId }: { orgId: string | null }) {
    const [branding, setBranding] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchBranding = async () => {
            setLoading(true)
            try {
                // If orgId is null, it returns Platform branding automatically
                const data = await getEffectiveBranding(orgId)
                setBranding(data)
            } catch (error) {
                console.error("Failed to load branding", error)
            } finally {
                setLoading(false)
            }
        }

        fetchBranding()
    }, [orgId])

    if (loading) {
        return <div className="h-10 w-32 bg-white/5 animate-pulse rounded-lg" />
    }

    if (!branding) return null

    // Check for logo
    const logoUrl = branding.logos?.main

    if (logoUrl) {
        return (
            <img src={logoUrl} alt={branding.name} className="max-h-12 w-auto object-contain" />
        )
    }

    // Fallback: Name
    return (
        <div className="flex items-center gap-2 text-white overflow-hidden">
            <div className="p-2 bg-indigo-600 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg truncate tracking-tight">{branding.name}</span>
        </div>
    )
}
