"use client"

import React, { useState } from "react"
import { Users, DollarSign, AlertCircle, TrendingUp, CreditCard, UserPlus, FilePlus, ClipboardCheck, Receipt } from "lucide-react"
import CountUp from "react-countup"
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { useRegisterView } from "@/modules/core/caa/context/view-context"
import { resolveDocumentState, resolveServiceState } from "@/domain/state"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useRouter } from "next/navigation"

// Import Modals (these were in page.tsx)
import { CreateClientSheet } from "@/modules/core/clients/create-client-sheet"
import { CreateQuoteSheet } from "@/modules/core/quotes/create-quote-sheet"
import { CreateInvoiceSheet } from "@/modules/core/billing/create-invoice-sheet"
import { CreateFormSheet } from "@/modules/features/forms/create-form-sheet"

interface AgencyDashboardProps {
    dashboardData: any
    extraData: any
    userRole?: string | null
    onReload?: () => void
}

export function AgencyDashboard({ dashboardData: dashboardRes, extraData, userRole: initialRole, onReload }: AgencyDashboardProps) {
    const { t, tArray } = useTranslation()
    const router = useRouter()

    // Modals internal state
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false)

    const refreshData = () => {
        router.refresh()
        if (onReload) onReload()
    }

    // CAA Registration (Context-Aware for Agency)
    useRegisterView({
        viewId: "dashboard",
        label: "Dashboard Agency",
        actions: [
            { id: "new-client", label: t('dashboard.actions.new_client'), type: "function", target: "open_client_modal", icon: UserPlus, description: t('dashboard.actions.new_client_desc') },
            { id: "new-quote", label: t('dashboard.actions.new_quote'), type: "function", target: "open_quote_modal", icon: FilePlus, description: t('dashboard.actions.new_quote_desc') },
            { id: "new-invoice", label: t('dashboard.actions.new_invoice'), type: "function", target: "open_invoice_modal", icon: Receipt, description: t('dashboard.actions.new_invoice_desc') },
            { id: "view-reports", label: t('dashboard.actions.view_reports'), type: "route", target: "/crm/reports", icon: TrendingUp, description: t('dashboard.actions.view_reports_desc') }
        ]
    })

    // Mapping Logic natively inside the component
    const { clients, invoices, services, settings, metrics } = dashboardRes || { clients: [], invoices: [], services: [] }

    let totalRevenue = 0
    let pendingPayments = 0
    let totalOverdue = 0
    let debtors: any[] = []
    let activeClientsCount = 0

    if (metrics && metrics.revenue !== undefined) {
        totalRevenue = metrics.revenue
        pendingPayments = metrics.pending
        totalOverdue = metrics.overdue
        debtors = metrics.debtors
        activeClientsCount = metrics.clients_count || 0
    } else {
        activeClientsCount = (clients || []).length
        const clientsWithOverdueMap = new Map<string, number>()

            ; (invoices || []).forEach((inv: any) => {
                const { status } = resolveDocumentState(inv)
                const amount = inv.total || 0
                if (status === 'paid') {
                    totalRevenue += amount
                } else if (status === 'pending') {
                    pendingPayments += amount
                } else if (status === 'overdue') {
                    pendingPayments += amount
                    totalOverdue += amount
                    clientsWithOverdueMap.set(inv.client_id, (clientsWithOverdueMap.get(inv.client_id) || 0) + amount)
                }
            })

        debtors = Array.from(clientsWithOverdueMap.entries()).map(([clientId, amount]) => {
            const client = (clients || []).find((c: any) => c.id === clientId)
            if (!client) return null
            const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim()
            return {
                id: clientId,
                name: fullName || client.company_name || 'Cliente',
                image: client.logo_url || client.avatar_url,
                debt: amount
            }
        }).filter(Boolean) as any[]
    }

    // let activeSubscriptions = 0
    // let monthlyRecurring = 0
    //     ; (services || []).forEach((svc: any) => {
    //         const { status } = resolveServiceState(svc)
    //         if (status === 'active' && svc.type === 'recurring') {
    //             activeSubscriptions++
    //             if (svc.frequency === 'monthly') monthlyRecurring += (svc.amount || 0)
    //         }
    //     })

    const data: DashboardDataProps = {
        globalBannerConfig: dashboardRes?.bannerConfig,
        agentStats: extraData?.agentStats,
        stats: [
            {
                title: t('dashboard.stats.total_clients'),
                value: activeClientsCount,
                icon: Users,
                subtext: pendingPayments > 0
                    ? <span className="text-indigo-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {t('dashboard.stats.pending_balance')}</span>
                    : <span className="text-green-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {t('dashboard.stats.all_good')}</span>
            },
            {
                title: t('dashboard.stats.total_revenue'),
                value: <CountUp end={totalRevenue} duration={2} separator="," prefix="$" />,
                icon: DollarSign,
                subtext: t('dashboard.stats.total_revenue_sub')
            },
            // {
            //     title: t('dashboard.hero.mrr_agency'), // MRR Ocultado
            //     value: <CountUp end={monthlyRecurring} duration={2} separator="," prefix="$" />,
            //     icon: TrendingUp,
            //     subtext: "Ingresos Recurrentes"
            // },
            {
                title: t('dashboard.stats.receivable'),
                value: <CountUp end={pendingPayments} duration={2} separator="," prefix="$" />,
                icon: AlertCircle,
                subtext: t('dashboard.stats.receivable_sub_agency')
            },
            // {
            //     title: t('dashboard.stats.active_subs'),
            //     value: activeSubscriptions,
            //     icon: CreditCard,
            //     subtext: t('dashboard.stats.active_subs_sub')
            // }
        ],
        social: {
            title: "Agency/Space",
            facebook: settings?.social_facebook,
            instagram: settings?.social_instagram,
            twitter: settings?.social_twitter,
        },
        quickActions: [
            { title: t('dashboard.actions.new_client'), icon: UserPlus, colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white", onClick: () => setIsClientModalOpen(true) },
            { title: t('dashboard.actions.new_quote'), icon: FilePlus, colorClass: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white", onClick: () => setIsQuoteModalOpen(true) },
            { title: t('dashboard.actions.new_brief'), icon: ClipboardCheck, colorClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white", onClick: () => setIsBriefingModalOpen(true) },
            { title: t('dashboard.actions.new_invoice'), icon: Receipt, colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white", onClick: () => setIsInvoiceModalOpen(true) }
        ],
        smartAlert: totalOverdue > 0 ? {
            title: t('dashboard.alerts.attention_required'),
            message: <span>{debtors.length} {t('dashboard.alerts.clients_in_debt')}. <span className="font-bold text-gray-900 dark:text-white">${totalOverdue.toLocaleString()}</span>.</span>,
            itemsHeading: t('dashboard.alerts.in_debt'),
            items: debtors
        } : undefined
    }

    return (
        <>
            <ModularDashboardLayout data={data} userRole={initialRole} />
            <CreateClientSheet open={isClientModalOpen} onOpenChange={setIsClientModalOpen} trigger={<span className="hidden" />} onSuccess={() => { setIsClientModalOpen(false); refreshData() }} />
            <CreateQuoteSheet open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen} trigger={<span className="hidden" />} onSuccess={() => { setIsQuoteModalOpen(false); refreshData() }} />
            <CreateFormSheet open={isBriefingModalOpen} onOpenChange={setIsBriefingModalOpen} onSuccess={() => setIsBriefingModalOpen(false)} />
            <CreateInvoiceSheet open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen} trigger={<span className="hidden" />} onSuccess={() => { setIsInvoiceModalOpen(false); refreshData() }} />
        </>
    )
}

