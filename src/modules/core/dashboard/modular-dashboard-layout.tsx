
"use client"

import { MagicStatCard, MagicStatCardProps } from "@/modules/core/dashboard/widgets/smart-cards/magic-stat-card"
import { QuickAction, QuickActionProps } from "@/modules/core/dashboard/widgets/smart-cards/quick-action"
import { SmartAlert, SmartAlertProps } from "@/modules/core/dashboard/widgets/smart-cards/smart-alert"
import { SocialGlassWidget, SocialGlassWidgetProps } from "@/modules/core/dashboard/widgets/smart-cards/social-glass-widget"
import { SplitText } from "@/components/ui/split-text"
import { SectionHeader } from "@/components/layout/section-header"
import { LayoutDashboard } from "lucide-react"

import { useState, useEffect } from "react"

import { GlobalBannerConfig, GlobalDashboardBanner } from "@/modules/core/dashboard/components/global-dashboard-banner"
import { DynamicGreetingHeader } from "@/components/layout/dynamic-greeting-header"
import { useActiveModules } from "@/hooks/use-active-modules"

export interface DashboardDataProps {
    stats: MagicStatCardProps[]
    social?: SocialGlassWidgetProps
    quickActions: QuickActionProps[]
    smartAlert?: SmartAlertProps
    globalBannerConfig?: GlobalBannerConfig | null
    agentStats?: any[]
    settings?: any
    orgType?: string
    extraData?: any
}

export function ModularDashboardLayout({ data, userRole: initialRole }: { data: DashboardDataProps, userRole?: string | null }) {
    const { userRole: hookRole } = useActiveModules();
    const userRole = initialRole || hookRole;
    const isMember = userRole === 'member' || userRole === 'miembro';

    return (
        <div className="space-y-6">
            {/* Header - Could be dynamic later */}
            {/* dynamic Standardized Header */}
            <DynamicGreetingHeader />
            


            {/* 1. Stats Grid (Dynamic) - HIDDEN FOR MEMBERS */}
            {!isMember && (
                <div className={`grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(data.stats.length, 4)}`}>
                    {data.stats.map((stat, i) => (
                        <MagicStatCard key={i} {...stat} />
                    ))}
                </div>
            )}


            {/* 3. Quick Actions (Dynamic Grid) - HIDDEN FOR MEMBERS */}
            {!isMember && (
                <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
                    {data.quickActions.map((action, i) => (
                        <QuickAction key={i} {...action} />
                    ))}
                </div>
            )}

            {/* 4. Smart Alert (Full Width) - HIDDEN FOR MEMBERS */}
            {!isMember && data.smartAlert && (
                <div className="mt-8">
                    <SmartAlert {...data.smartAlert} />
                </div>
            )}

            {/* 5. Hero Section (Global Banner + Social) - Movido al fondo por petición del usuario */}
            {(data.globalBannerConfig?.is_active || data.social) && (
                <div className="flex gap-8 flex-col lg:flex-row">
                    {/* Global Banner (Flex 1) */}
                    {data.globalBannerConfig?.is_active && (
                        <div className="flex-1 min-w-0">
                            <GlobalDashboardBanner config={data.globalBannerConfig} />
                        </div>
                    )}

                    {/* Social Card (Fixed Width handled by internal component usually) */}
                    {data.social && (
                        <div className="flex items-center justify-center lg:justify-start shrink-0">
                            <SocialGlassWidget {...data.social} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
