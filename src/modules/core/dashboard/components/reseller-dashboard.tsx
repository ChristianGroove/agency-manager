"use client"

import React, { useState } from "react"
import { Building2, DollarSign, AlertCircle, CreditCard, UserPlus, FilePlus, ClipboardCheck, Receipt } from "lucide-react"
import CountUp from "react-countup"
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { resolveDocumentState } from "@/domain/state"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useRouter } from "next/navigation"

import { CreateClientSheet } from "@/modules/core/clients/create-client-sheet"
import { CreateQuoteSheet } from "@/modules/core/quotes/create-quote-sheet"
import { CreateInvoiceSheet } from "@/modules/core/billing/create-invoice-sheet"
import { CreateFormSheet } from "@/modules/core/forms/create-form-sheet"
import { CreateOrganizationSheet } from "@/components/organizations/create-organization-sheet"

interface ResellerDashboardProps {
    dashboardData: any
    extraData: any
    userRole?: string | null
    onReload?: () => void
}

export function ResellerDashboard({ dashboardData: dashboardRes, extraData, userRole: initialRole, onReload }: ResellerDashboardProps) {
    const { t } = useTranslation()
    const router = useRouter()

    // Modals
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false)
    const [isNewOrgModalOpen, setIsNewOrgModalOpen] = useState(false)

    const refreshData = () => {
        router.refresh()
        if (onReload) onReload()
    }

    const { invoices, settings, metrics, clients } = dashboardRes || { invoices: [] }
    const tenantCount = extraData?.tenantCount || 0

    let totalRevenue = 0
    let pendingPayments = 0
    let totalOverdue = 0
    let debtors: any[] = []

    if (metrics && metrics.revenue !== undefined) {
        totalRevenue = metrics.revenue
        pendingPayments = metrics.pending
        totalOverdue = metrics.overdue
        debtors = metrics.debtors
    } else {
        const clientsWithOverdueMap = new Map<string, number>()

            ; (invoices || []).forEach((inv: any) => {
                const { status } = resolveDocumentState(inv)
                const amount = inv.total || 0

                if (status === 'paid') totalRevenue += amount
                else if (status === 'pending') pendingPayments += amount
                else if (status === 'overdue') {
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

    const data: DashboardDataProps = {
        globalBannerConfig: dashboardRes?.bannerConfig,
        agentStats: extraData?.agentStats,
        stats: [
            {
                title: t('dashboard.stats.active_tenants'),
                value: tenantCount || 0,
                icon: Building2,
                subtext: t('dashboard.stats.active_tenants_sub')
            },
            {
                title: t('dashboard.stats.total_revenue'),
                value: <CountUp end={totalRevenue} duration={2} separator="," prefix="$" />,
                icon: DollarSign,
                subtext: t('dashboard.stats.total_revenue_sub')
            },
            {
                title: t('dashboard.stats.receivable'),
                value: <CountUp end={pendingPayments} duration={2} separator="," prefix="$" />,
                icon: AlertCircle,
                subtext: t('dashboard.stats.receivable_sub')
            },
            {
                title: t('dashboard.stats.avg_ticket'),
                value: <CountUp end={(tenantCount ?? 0) > 0 ? totalRevenue / (tenantCount ?? 1) : 0} duration={2} separator="," prefix="$" />,
                icon: CreditCard,
                subtext: t('dashboard.stats.avg_ticket_sub')
            }
        ],
        social: {
            title: "Platform/Space",
            facebook: settings?.social_facebook,
            instagram: settings?.social_instagram,
            twitter: settings?.social_twitter,
        },
        quickActions: [
            { title: t('dashboard.actions.new_tenant'), icon: Building2, colorClass: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white", onClick: () => setIsNewOrgModalOpen(true) },
            { title: t('dashboard.actions.new_client'), icon: UserPlus, colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white", onClick: () => setIsClientModalOpen(true) },
            { title: t('dashboard.actions.new_quote'), icon: FilePlus, colorClass: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white", onClick: () => setIsQuoteModalOpen(true) },
            { title: t('dashboard.actions.new_brief'), icon: ClipboardCheck, colorClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white", onClick: () => setIsBriefingModalOpen(true) },
            { title: t('dashboard.actions.new_invoice'), icon: Receipt, colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white", onClick: () => setIsInvoiceModalOpen(true) }
        ],
        smartAlert: totalOverdue > 0 ? {
            title: t('dashboard.alerts.attention_portfolio'),
            message: <span>{t('dashboard.alerts.attention_portfolio_msg')} Total: <span className="font-bold text-gray-900 dark:text-white">${totalOverdue.toLocaleString()}</span>.</span>,
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
            <CreateOrganizationSheet open={isNewOrgModalOpen} onOpenChange={setIsNewOrgModalOpen} onSuccess={() => { setIsNewOrgModalOpen(false); refreshData() }} />
        </>
    )
}
