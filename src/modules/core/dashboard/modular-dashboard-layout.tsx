
"use client"

import { MagicStatCard, MagicStatCardProps } from "@/modules/core/dashboard/widgets/smart-cards/magic-stat-card"
import { RevenueHero, RevenueHeroProps } from "@/modules/core/dashboard/widgets/smart-cards/revenue-hero"
import { QuickAction, QuickActionProps } from "@/modules/core/dashboard/widgets/smart-cards/quick-action"
import { SmartAlert, SmartAlertProps } from "@/modules/core/dashboard/widgets/smart-cards/smart-alert"
import { SocialGlassWidget, SocialGlassWidgetProps } from "@/modules/core/dashboard/widgets/smart-cards/social-glass-widget"
import { SplitText } from "@/components/ui/split-text"
import { SectionHeader } from "@/components/layout/section-header"
import { LayoutDashboard } from "lucide-react"

export interface DashboardDataProps {
    stats: MagicStatCardProps[]
    revenueHero: RevenueHeroProps
    social?: SocialGlassWidgetProps
    quickActions: QuickActionProps[]
    smartAlert?: SmartAlertProps
}

export function ModularDashboardLayout({ data }: { data: DashboardDataProps }) {
    return (
        <div className="space-y-6">
            {/* Header - Could be dynamic later */}
            {/* Standardized Header */}
            <SectionHeader
                title="Dashboard"
                subtitle="Resumen en tiempo real de tu negocio"
                icon={LayoutDashboard}
            />

            {/* 1. Stats Grid (Dynamic) */}
            <div className={`grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(data.stats.length, 4)}`}>
                {data.stats.map((stat, i) => (
                    <MagicStatCard key={i} {...stat} />
                ))}
            </div>

            {/* 2. Hero Section (Revenue + Social) */}
            <div className="flex gap-8 flex-col lg:flex-row">
                {/* Revenue Hero (Flex 1) */}
                <RevenueHero {...data.revenueHero} />

                {/* Social Card (Fixed Width handled by internal component usually) */}
                {data.social && (
                    <div className="flex items-center justify-center lg:justify-start">
                        <SocialGlassWidget {...data.social} />
                    </div>
                )}
            </div>

            {/* 3. Quick Actions (Dynamic Grid) */}
            <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
                {data.quickActions.map((action, i) => (
                    <QuickAction key={i} {...action} />
                ))}
            </div>

            {/* 4. Smart Alert (Full Width) */}
            {data.smartAlert && (
                <div className="mt-8">
                    <SmartAlert {...data.smartAlert} />
                </div>
            )}
        </div>
    )
}
