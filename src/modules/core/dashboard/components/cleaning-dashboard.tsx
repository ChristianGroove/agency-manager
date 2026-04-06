"use client"

import React, { useState } from "react"
import { Users, Calendar, Sparkles, PlayCircle, CheckCircle2, Clock, UserPlus } from "lucide-react"
import CountUp from "react-countup"
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { useTranslation } from "@/lib/i18n/use-translation"

// Import Modals (these were in page.tsx)
import { CreateLeadSheet as CreateClientSheet } from "@/modules/features/crm/components/create-lead-sheet"
import { NewJobModal } from "@/modules/features/work-orders/components/new-job-modal"

import { useRouter } from "next/navigation"

interface CleaningDashboardProps {
    dashboardData: any
    extraData: any
    userRole?: string | null
    onReload?: () => void
}

export function CleaningDashboard({ dashboardData: coreData, extraData, userRole: initialRole, onReload }: CleaningDashboardProps) {
    const { t, tArray } = useTranslation()
    const router = useRouter()

    // Modals internal state
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false)

    // Mapping Logic natively inside the component
    const metrics = extraData?.cleaningMetrics || { total: 0, in_progress: 0, pending: 0, completed: 0 }
    const revenueData = extraData?.cleaningRevenue || []
    const totalRevenueWeek = revenueData.reduce((acc: any, curr: any) => acc + curr.revenue, 0)

    const quickActions = [
        {
            title: t('dashboard.actions.new_job'),
            icon: Sparkles,
            colorClass: "bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white",
            onClick: () => setIsNewJobModalOpen(true)
        },
        {
            title: t('dashboard.actions.view_calendar'),
            icon: Calendar,
            colorClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
            onClick: () => window.location.href = '/cleaning'
        },
        {
            title: t('dashboard.actions.staff'),
            icon: Users,
            colorClass: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
            onClick: () => window.location.href = '/cleaning?tab=staff'
        },
        {
            title: t('dashboard.actions.new_client'),
            icon: UserPlus,
            colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white",
            onClick: () => setIsClientModalOpen(true)
        }
    ]

    let smartAlert = undefined
    if (metrics.pending > 0) {
        smartAlert = {
            title: t('dashboard.alerts.pending_ops'),
            message: <span>{t('dashboard.alerts.pending_ops_msg')}</span>,
            items: [],
        }
    }

    const data: DashboardDataProps = {
        globalBannerConfig: coreData?.bannerConfig,
        agentStats: extraData?.agentStats,
        stats: [
            {
                title: t('dashboard.stats.jobs_today'),
                value: metrics.total,
                icon: Calendar,
                subtext: t('dashboard.stats.jobs_today_sub')
            },
            {
                title: t('dashboard.stats.in_progress'),
                value: metrics.in_progress,
                icon: PlayCircle,
                gradientColor: "#F97316",
                subtext: t('dashboard.stats.in_progress_sub')
            },
            {
                title: t('dashboard.stats.pending'),
                value: metrics.pending,
                icon: Clock,
                gradientColor: "#EAB308",
                subtext: t('dashboard.stats.pending_sub')
            },
            {
                title: t('dashboard.stats.completed'),
                value: metrics.completed,
                icon: CheckCircle2,
                gradientColor: "#22C55E",
                subtext: t('dashboard.stats.completed_sub')
            }
        ],
        social: {
            title: "Cleaning/Space",
            facebook: coreData?.settings?.social_facebook,
            instagram: coreData?.settings?.social_instagram,
            twitter: coreData?.settings?.social_twitter,
        },
        quickActions: quickActions,
        smartAlert: smartAlert
    }

    const refreshData = () => {
        router.refresh()
        if (onReload) onReload()
    }

    return (
        <>
            <ModularDashboardLayout data={data} userRole={initialRole} />
            <CreateClientSheet open={isClientModalOpen} onOpenChange={setIsClientModalOpen} onSuccess={() => { setIsClientModalOpen(false); refreshData() }} />
            <NewJobModal open={isNewJobModalOpen} onOpenChange={setIsNewJobModalOpen} />
        </>
    )
}

