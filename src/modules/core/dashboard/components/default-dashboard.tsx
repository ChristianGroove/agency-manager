"use client"

import React, { useState } from "react"
import { Users, LayoutDashboard, UserPlus, Inbox, Sparkles } from "lucide-react"
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { useTranslation } from "@/lib/i18n/use-translation"
import { CreateLeadSheet as CreateClientSheet } from "@/modules/features/crm/components/create-lead-sheet"
import { useRouter } from "next/navigation"

interface DefaultDashboardProps {
    dashboardData: any
    extraData: any
    userRole?: string | null
    onReload?: () => void
}

/**
 * Default Dashboard for new Official Spaces
 * Implements the core requirements:
 * - Banner block (via globalBannerConfig)
 * - Premium 3D Card (SocialGlassWidget)
 * - 3 Blank Insight Magic Cards
 * - Quick Actions: Create Contact, Inbox
 */
export function DefaultDashboard({ dashboardData, extraData, userRole: initialRole, onReload }: DefaultDashboardProps) {
    const { t } = useTranslation()
    const router = useRouter()
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)

    const refreshData = () => {
        router.refresh()
        if (onReload) onReload()
    }

    const data: DashboardDataProps = {
        globalBannerConfig: dashboardData?.bannerConfig,
        agentStats: extraData?.agentStats,
        stats: [
            {
                title: "Insight #1",
                value: "---",
                icon: Sparkles,
                subtext: "Configura este insight desde el superadmin"
            },
            {
                title: "Insight #2",
                value: "---",
                icon: Sparkles,
                subtext: "Configura este insight desde el superadmin"
            },
            {
                title: "Insight #3",
                value: "---",
                icon: Sparkles,
                subtext: "Configura este insight desde el superadmin"
            }
        ],
        social: {
            title: "Premium 3D Experience",
            // Fallback colors/links or empty for 3D card effect
            facebook: dashboardData?.settings?.social_facebook,
            instagram: dashboardData?.settings?.social_instagram,
            twitter: dashboardData?.settings?.social_twitter,
        },
        quickActions: [
            { 
                title: "Crear contacto", 
                icon: UserPlus, 
                colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white", 
                onClick: () => setIsClientModalOpen(true) 
            },
            { 
                title: "Inbox", 
                icon: Inbox, 
                colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white", 
                onClick: () => router.push('/inbox')
            }
        ]
    }

    return (
        <>
            <ModularDashboardLayout data={data} userRole={initialRole} />
            <CreateClientSheet 
                open={isClientModalOpen} 
                onOpenChange={setIsClientModalOpen} 
                onSuccess={() => { setIsClientModalOpen(false); refreshData() }} 
            />
        </>
    )
}
