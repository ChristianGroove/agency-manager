"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Building2 } from "lucide-react"

export function OrgBranding({ orgId }: { orgId: string | null }) {
    const [org, setOrg] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!orgId) return

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const fetchOrg = async () => {
            setLoading(true)
            // Typically branding settings are in a separate table or column.
            // Requirement: "activeOrganization.settings?.portal_logo_url"
            // I'll fetch the org content.
            const { data } = await supabase
                .from("organizations")
                .select("*")
                .eq("id", orgId)
                .single()
            setOrg(data)
            setLoading(false)
        }

        fetchOrg()
    }, [orgId])

    if (loading) {
        return <div className="h-10 w-32 bg-white/5 animate-pulse rounded-lg" />
    }

    if (!org) return null

    // Check for logo in settings (assuming structure based on user request)
    // "activeOrganization.settings?.portal_logo_url" uses JSONB likely?
    // Let's assume 'settings' column exists and is JSONB.
    const logoUrl = org.settings?.portal_logo_url

    if (logoUrl) {
        return (
            <img src={logoUrl} alt={org.name} className="max-h-12 w-auto object-contain" />
        )
    }

    // Fallback: Name
    return (
        <div className="flex items-center gap-2 text-white overflow-hidden">
            <div className="p-2 bg-indigo-600 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg truncate tracking-tight">{org.name}</span>
        </div>
    )
}
