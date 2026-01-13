"use client"

import { useEffect, useState } from "react"
import { getOrganizationCardDetails } from "@/modules/core/organizations/actions"
import { cn } from "@/lib/utils"
import { Building2, ChevronRight, Crown, Sparkles } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useTheme } from "next-themes"

interface OrganizationCardProps {
    orgId: string | null
    collapsed: boolean
    className?: string
}

export function OrganizationCard({ orgId, collapsed, className }: OrganizationCardProps) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const fetchDetails = async () => {
            setLoading(true)
            try {
                const result = await getOrganizationCardDetails(orgId)
                setData(result)
            } catch (error) {
                console.error("Failed to load organization card", error)
            } finally {
                setLoading(false)
            }
        }

        fetchDetails()
    }, [orgId])

    if (loading) {
        if (collapsed) {
            return <Skeleton className="h-10 w-10 rounded-xl" />
        }
        return (
            <div className="flex items-center gap-3 w-full">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
        )
    }

    if (!data) return null

    const { branding, subscription } = data

    // Logo Logic
    const showLightLogo = mounted && resolvedTheme === 'light'
    const logoUrl = (showLightLogo && branding.logos?.favicon) ? branding.logos.favicon : (branding.logos?.favicon || branding.logos?.portal)
    // We prefer Favicon/Isotype for the sidebar icon as it's square usually. 
    // If not, try main logo but constrain size.

    // Initials Fallback
    const initials = branding.name.substring(0, 2).toUpperCase()

    // Plan Indicator
    const isPro = subscription.status === 'active' || subscription.status === 'trialing'
    const planLabel = subscription.planName || "Plan Gratuito"

    return (
        <div className={cn(
            "group flex items-center gap-3 w-full p-2 rounded-2xl transition-all duration-200",
            collapsed ? "justify-center px-0 hover:bg-transparent" : "hover:bg-gray-100/50 dark:hover:bg-white/5 cursor-pointer",
            className
        )}>
            {/* Logo / Avatar Removed by User Request */}
            {/* <div className={cn(...)} /> */}

            {/* Text Details (Expanded Only) */}
            {!collapsed && (
                <div className="flex-1 min-w-0 flex flex-col justify-center animate-in fade-in slide-in-from-left-2 duration-300">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                        {branding.name}
                    </h2>

                    <div className="flex items-center gap-1.5 mt-0.5">
                        {isPro ? (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-brand-pink bg-brand-pink/10 px-1.5 py-0.5 rounded-full truncate">
                                <Crown className="w-3 h-3" />
                                <span className="truncate max-w-[80px]">{planLabel}</span>
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground truncate">{planLabel}</span>
                        )}
                    </div>
                </div>
            )}

            {/* Logout Button (Stop Propagation) */}
            {!collapsed && (
                <div
                    onClick={(e) => {
                        e.stopPropagation()
                        import("@/modules/core/auth/actions").then(mod => mod.logout())
                    }}
                    className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors z-10"
                    title="Cerrar Sesión"
                >
                    <LogOut className="w-4 h-4" />
                </div>
            )}
        </div>
    )
}

import { LogOut } from "lucide-react"
