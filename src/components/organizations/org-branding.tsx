"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr" // Keep if needed or remove unused
import { Building2 } from "lucide-react"
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { useTheme } from "next-themes"

const brandingCache = new Map<string, any>()

export function OrgBranding({ orgId, collapsed = false }: { orgId: string | null, collapsed?: boolean }) {
    const [branding, setBranding] = useState<any>(brandingCache.get(orgId || 'platform') || null)
    const [loading, setLoading] = useState(!branding)
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)

        const fetchBranding = async (force = false) => {
            // Check cache unless forced
            if (!force && brandingCache.has(orgId || 'platform')) {
                setBranding(brandingCache.get(orgId || 'platform'))
                setLoading(false)
                return
            }

            setLoading(true)
            try {
                const data = await getEffectiveBranding(orgId)
                brandingCache.set(orgId || 'platform', data)
                setBranding(data)
            } catch (error) {
                console.error("Failed to load branding", error)
            } finally {
                setLoading(false)
            }
        }

        fetchBranding()

        // Listener for updates
        const handleUpdate = () => {
            brandingCache.delete(orgId || 'platform')
            fetchBranding(true)
        }

        window.addEventListener('branding-updated', handleUpdate)
        return () => window.removeEventListener('branding-updated', handleUpdate)
    }, [orgId])

    if (loading) {
        if (collapsed) {
            return <div className="h-9 w-9 bg-white/5 animate-pulse rounded-lg" />
        }
        return <div className="h-10 w-32 bg-white/5 animate-pulse rounded-lg" />
    }

    if (!branding) return null

    // COLLAPSED STATE
    if (collapsed) {
        const isotypeUrl = branding.logos?.favicon // Mapped to isotipo_url in actions

        if (isotypeUrl) {
            return (
                <div className="w-9 h-9 flex items-center justify-center overflow-hidden">
                    <img src={isotypeUrl} alt={branding.name} className="w-full h-full object-contain p-1" />
                </div>
            )
        }

        // Fallback initials
        const initials = branding.name.substring(0, 2).toUpperCase()
        return (
            <div className="w-9 h-9 flex items-center justify-center bg-indigo-600 rounded-lg text-white font-bold text-xs shadow-lg shadow-indigo-500/20 border border-white/10">
                {initials}
            </div>
        )
    }

    // EXPANDED STATE (Existing Logic)

    // Check for Main Logo
    const logoDark = branding.logos?.main
    const logoLight = branding.logos?.main_light

    // Choose logo based on theme
    // Default to dark logo if not mounted or theme is dark
    const showLightLogo = mounted && resolvedTheme === 'light'
    const logoUrl = (showLightLogo && logoLight) ? logoLight : logoDark

    if (logoUrl) {
        return (
            <img
                key={logoUrl} // Force re-render on change
                src={logoUrl}
                alt={branding.name}
                className="h-8 w-auto object-contain object-left"
            />
        )
    }

    // Fallback: Name
    return (
        <div className="flex items-center gap-2 text-white overflow-hidden">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
                <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm truncate tracking-tight">{branding.name}</span>
        </div>
    )
}
