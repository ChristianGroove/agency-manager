"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Users, MessageSquare, ListChecks, TrendingUp,
    UserPlus, ClipboardPlus, Inbox, Target, Megaphone
} from "lucide-react"
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { SprintBoardMini } from "@/modules/core/dashboard/widgets/sprint-board-mini"
import { useRegisterView } from "@/modules/features/caa/context/view-context"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { CreateClientSheet } from "@/modules/features/crm/components/create-client-sheet"

interface SaasDashboardProps {
    dashboardData: any
    extraData: any
    userRole?: string | null
    onReload?: () => void
}

export function SaasDashboard({ dashboardData, extraData, userRole: initialRole, onReload }: SaasDashboardProps) {
    const { t } = useTranslation()
    const router = useRouter()
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)

    const refreshData = () => {
        router.refresh()
        if (onReload) onReload()
    }

    const metrics = extraData?.saasMetrics || {
        totalContacts: 0,
        newContactsThisWeek: 0,
        activeTasks: 0,
        activeProgress: 0,
        completedThisMonth: 0,
        totalTasks: 0,
        taskVelocity: 0,
        resolutionRate: 0,
        sprintProgress: 0,
        sprintTotal: 0,
        statusCounts: { backlog: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, blocked: 0 },
        backlogCount: 0,
        openConversations: 0,
        unansweredConversations: 0
    }

    // CAA Registration
    useRegisterView({
        viewId: "dashboard-saas",
        label: "Dashboard SaaS",
        actions: [
            { id: "new-contact", label: "Nuevo Contacto", type: "function", target: "open_client_modal", icon: UserPlus, description: "Crear un nuevo contacto" },
            { id: "new-task", label: "Nueva Tarea", type: "route", target: "/operations/tasks", icon: ClipboardPlus, description: "Ir al módulo de tareas" },
            { id: "open-inbox", label: "Inbox", type: "route", target: "/inbox", icon: Inbox, description: "Abrir bandeja de entrada" },
            { id: "view-pipeline", label: "Pipeline", type: "route", target: "/crm/pipeline", icon: Target, description: "Ver pipeline de ventas" },
            { id: "marketing", label: "Marketing", type: "route", target: "/crm/marketing", icon: Megaphone, description: "Campañas de marketing" }
        ]
    })

    const data: DashboardDataProps = {
        globalBannerConfig: dashboardData?.bannerConfig,
        agentStats: extraData?.agentStats,
        stats: [
            {
                title: "Contactos Totales",
                value: metrics.totalContacts,
                icon: Users,
                subtext: metrics.newContactsThisWeek > 0
                    ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{metrics.newContactsThisWeek} esta semana</span>
                    : <span>Sin nuevos esta semana</span>
            },
            {
                title: "Inbox Activo",
                value: metrics.openConversations,
                icon: MessageSquare,
                subtext: metrics.unansweredConversations > 0
                    ? <span className="text-amber-600 dark:text-amber-400 font-semibold">{metrics.unansweredConversations} sin responder</span>
                    : <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Todo al día</span>
            },
            {
                title: "Tareas Activas",
                value: metrics.activeTasks,
                icon: ListChecks,
                subtext: <span>{metrics.completedThisMonth} completadas este mes</span>
            },
            {
                title: "Tasa de Resolución",
                value: `${metrics.resolutionRate}%`,
                icon: TrendingUp,
                subtext: <span>Velocidad: {metrics.taskVelocity} tareas/sem</span>
            }
        ],
        social: {
            companyName: dashboardData?.settings?.agency_name,
            facebook: "https://www.facebook.com/pixyspaces",
            instagram: "https://www.instagram.com/pixyspaces/",
            whatsapp: "https://wa.me/573504076800",
        },
        quickActions: [
            {
                title: "Nuevo Contacto",
                icon: UserPlus,
                colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white",
                onClick: () => setIsClientModalOpen(true)
            },
            {
                title: "Nueva Tarea",
                icon: ClipboardPlus,
                colorClass: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white",
                onClick: () => router.push('/operations/tasks')
            },
            {
                title: "Inbox",
                icon: Inbox,
                colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white",
                onClick: () => router.push('/inbox')
            },
            {
                title: "Pipeline",
                icon: Target,
                colorClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
                onClick: () => router.push('/crm/pipeline')
            },
            {
                title: "Marketing",
                icon: Megaphone,
                colorClass: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white",
                onClick: () => router.push('/crm/marketing')
            }
        ],
        smartAlert: metrics.unansweredConversations >= 3 ? {
            title: "Conversaciones pendientes",
            message: <span><span className="font-bold text-foreground">{metrics.unansweredConversations}</span> conversaciones llevan tiempo sin respuesta en el inbox.</span>,
            itemsHeading: "Pendientes de respuesta",
            items: []
        } : undefined
    }

    return (
        <>
            <ModularDashboardLayout data={data} userRole={initialRole}>
                {/* Sprint Board Mini — injected between Quick Actions and SmartAlert */}
                <SprintBoardMini
                    statusCounts={metrics.statusCounts}
                    sprintProgress={metrics.sprintProgress}
                />
            </ModularDashboardLayout>
            <CreateClientSheet
                open={isClientModalOpen}
                onOpenChange={setIsClientModalOpen}
                onSuccess={() => { setIsClientModalOpen(false); refreshData() }}
            />
        </>
    )
}
