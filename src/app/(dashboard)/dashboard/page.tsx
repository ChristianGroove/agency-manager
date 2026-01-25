"use client"

import { useEffect, useState } from "react"
import { Users, DollarSign, FileText, CreditCard, TrendingUp, AlertCircle, UserPlus, FilePlus, ClipboardCheck, Receipt, Sparkles, Calendar, PlayCircle, CheckCircle2, Clock, Building2 } from "lucide-react"
import CountUp from "react-countup"
import { GlobalLoader } from "@/components/ui/global-loader"

// Modular System
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { getOrganizationModules } from "@/modules/core/organizations/actions"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

// Modals
import { CreateClientSheet } from "@/modules/core/clients/create-client-sheet"
import { CreateQuoteSheet } from "@/modules/core/quotes/create-quote-sheet"
import { CreateInvoiceSheet } from "@/modules/core/billing/create-invoice-sheet"
import { CreateFormSheet } from "@/modules/core/forms/create-form-sheet"
import { NewJobModal } from "@/modules/core/work-orders/components/new-job-modal"
import { CreateOrganizationSheet } from "@/components/organizations/create-organization-sheet"

// Utils
import { resolveDocumentState, resolveServiceState } from "@/domain/state"

import { useRegisterView } from "@/modules/core/caa/context/view-context"

import { useTranslation } from "@/lib/i18n/use-translation"

export default function DashboardPage() {
    const { t } = useTranslation()
    const [dashboardData, setDashboardData] = useState<DashboardDataProps | null>(null)
    const [loading, setLoading] = useState(true)
    const [orgType, setOrgType] = useState<'agency' | 'cleaning'>('agency') // Default to agency

    // Modal States
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false)
    const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false)
    const [isNewOrgModalOpen, setIsNewOrgModalOpen] = useState(false)

    // CAA Registration
    useRegisterView({
        viewId: "dashboard",
        label: "Dashboard",
        topics: ["getting-started", "metrics", "quick-actions"],
        actions: [
            { id: "new-client", label: t('dashboard.actions.new_client'), type: "function", target: "open_client_modal", icon: UserPlus, description: t('dashboard.actions.new_client_desc') },
            { id: "new-quote", label: t('dashboard.actions.new_quote'), type: "function", target: "open_quote_modal", icon: FilePlus, description: t('dashboard.actions.new_quote_desc') },
            { id: "new-invoice", label: t('dashboard.actions.new_invoice'), type: "function", target: "open_invoice_modal", icon: Receipt, description: t('dashboard.actions.new_invoice_desc') },
            { id: "view-reports", label: t('dashboard.actions.view_reports'), type: "route", target: "/crm/reports", icon: TrendingUp, description: t('dashboard.actions.view_reports_desc') }
        ]
    })

    useEffect(() => {
        loadDashboard()
    }, [])

    const loadDashboard = async () => {
        try {
            const orgId = await getCurrentOrganizationId()
            if (!orgId) return

            // 1. Detect Type
            const { getCurrentOrgDetails } = await import("@/modules/core/organizations/actions")
            const [modules, orgDetails] = await Promise.all([
                getOrganizationModules(orgId),
                getCurrentOrgDetails()
            ])

            console.log("🔍 DASHBOARD DEBUG:", { orgId, modules, type: orgDetails?.organization_type })

            const isCleaning = modules.includes('module_cleaning') || modules.includes('vertical_cleaning')
            const isReseller = orgDetails?.organization_type === 'reseller' || orgDetails?.organization_type === 'platform'

            // 2. Load Data
            if (isReseller) {
                await loadResellerData(orgId)
            } else if (isCleaning) {
                await loadCleaningData(orgId)
            } else {
                await loadAgencyData()
            }
        } catch (error) {
            console.error("Dashboard Load Error", error)
        } finally {
            setLoading(false)
        }
    }

    // --- RESELLER ADAPTER ---
    const loadResellerData = async (orgId: string) => {
        const { supabase } = await import("@/lib/supabase")

        // Fetch Tenants
        const { count: tenantCount, data: tenants } = await supabase
            .from('organizations')
            .select('id, name, logo_url, status', { count: 'exact' })
            .eq('parent_organization_id', orgId)

        // Fetch CRM Data (Revenue)
        const { getDashboardData } = await import("@/modules/core/dashboard/actions")
        const { invoices, settings } = await getDashboardData()

        // Calculate Revenue and Debtors
        let totalRevenue = 0
        let pendingPayments = 0
        let totalOverdue = 0
        const clientsWithOverdueMap = new Map<string, number>()

        invoices.forEach(inv => {
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

        // Prepare Debtors List
        // We need client names. Invoices have client_id. 
        // We might need to fetch clients if not available in `invoices` join (usually getDashboardData fetches invoices with client)
        // Let's assume invoices has client relation or we fetch clients.
        // `getDashboardData` returns `clients` too. Let's use it.
        const { clients } = await getDashboardData()

        const debtors = Array.from(clientsWithOverdueMap.entries()).map(([clientId, amount]) => {
            const client = clients.find(c => c.id === clientId)
            if (!client) return null

            const firstName = client.first_name || ''
            const lastName = client.last_name || ''
            const fullName = `${firstName} ${lastName}`.trim()

            return {
                id: clientId,
                name: fullName || client.company_name || 'Cliente',
                image: client.logo_url || client.avatar_url,
                debt: amount
            }
        }).filter(Boolean) as any[]

        const data: DashboardDataProps = {
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
            revenueHero: {
                title: t('dashboard.hero.recurring_revenue'),
                value: <CountUp end={totalRevenue} duration={2} separator="," />, // Placeholder for MRR
                unit: "COP/mes",
                tips: ["Ofrece planes anuales para mejorar el flujo.", "Revisa el uso de tus clientes top."]
            },
            social: {
                facebook: settings?.social_facebook,
                instagram: settings?.social_instagram,
                twitter: settings?.social_twitter,
                fbFollowers: settings?.social_facebook_followers,
                igFollowers: settings?.social_instagram_followers
            },
            quickActions: [
                { title: t('dashboard.actions.new_tenant'), icon: Building2, colorClass: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white", onClick: () => setIsNewOrgModalOpen(true) },
                { title: t('dashboard.actions.new_client'), icon: UserPlus, colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white", onClick: () => setIsClientModalOpen(true) },
                { title: t('dashboard.actions.new_quote'), icon: FilePlus, colorClass: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white", onClick: () => setIsQuoteModalOpen(true) },
                { title: t('dashboard.actions.new_brief'), icon: ClipboardCheck, colorClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white", onClick: () => setIsBriefingModalOpen(true) },
                { title: t('dashboard.actions.new_invoice'), icon: Receipt, colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white", onClick: () => setIsInvoiceModalOpen(true) }
            ],
            smartAlert: clientsWithOverdueMap.size > 0 ? {
                title: t('dashboard.alerts.attention_portfolio'),
                message: <span>{t('dashboard.alerts.attention_portfolio_msg')} Total: <span className="font-bold text-gray-900">${totalOverdue.toLocaleString()}</span>.</span>,
                itemsHeading: t('dashboard.alerts.in_debt'),
                items: debtors
            } : undefined
        }
        setDashboardData(data)
    }

    // --- AGENCY ADAPTER ---
    const loadAgencyData = async () => {
        const { getDashboardData } = await import("@/modules/core/dashboard/actions")
        const { clients, invoices, services, settings } = await getDashboardData()

        // Calculate Agency Stats (Reused logic)
        let totalRevenue = 0
        let pendingPayments = 0
        let totalOverdue = 0
        let paidInvoicesCount = 0
        const clientsWithPendingSet = new Set<string>()
        const clientsWithOverdueMap = new Map<string, number>()

        invoices.forEach(inv => {
            const { status } = resolveDocumentState(inv)
            const amount = inv.total || 0
            if (status === 'paid') {
                totalRevenue += amount
                paidInvoicesCount++
            } else if (status === 'pending') {
                pendingPayments += amount
                clientsWithPendingSet.add(inv.client_id)
            } else if (status === 'overdue') {
                pendingPayments += amount
                totalOverdue += amount
                clientsWithPendingSet.add(inv.client_id)
                clientsWithOverdueMap.set(inv.client_id, (clientsWithOverdueMap.get(inv.client_id) || 0) + amount)
            }
        })

        let activeSubscriptions = 0
        let monthlyRecurring = 0
        services.forEach(svc => {
            const { status } = resolveServiceState(svc)
            if (status === 'active' && svc.type === 'recurring') {
                activeSubscriptions++
                if (svc.frequency === 'monthly') monthlyRecurring += (svc.amount || 0)
            }
        })

        const debtors = Array.from(clientsWithOverdueMap.entries()).map(([clientId, amount]) => {
            const client = clients.find(c => c.id === clientId)
            if (!client) return null

            const firstName = client.first_name || ''
            const lastName = client.last_name || ''
            const fullName = `${firstName} ${lastName}`.trim()

            return {
                id: clientId,
                name: fullName || client.company_name || 'Cliente',
                image: client.logo_url || client.avatar_url,
                debt: amount
            }
        }).filter(Boolean) as any[]

        // Map to Modular Structure
        const data: DashboardDataProps = {
            stats: [
                {
                    title: t('dashboard.stats.total_clients'),
                    value: clients.length,
                    icon: Users,
                    subtext: clientsWithPendingSet.size > 0
                        ? <span className="text-indigo-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {clientsWithPendingSet.size} {t('dashboard.stats.pending_balance')}</span>
                        : <span className="text-green-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {t('dashboard.stats.all_good')}</span>
                },
                {
                    title: t('dashboard.stats.total_revenue'),
                    value: <CountUp end={totalRevenue} duration={2} separator="," prefix="$" />,
                    icon: DollarSign,
                    subtext: `${paidInvoicesCount} ${t('dashboard.stats.paid_docs_sub')}`
                },
                {
                    title: t('dashboard.stats.receivable'),
                    value: <CountUp end={pendingPayments} duration={2} separator="," prefix="$" />,
                    icon: AlertCircle,
                    subtext: t('dashboard.stats.receivable_sub_agency')
                },
                {
                    title: t('dashboard.stats.active_subs'),
                    value: activeSubscriptions,
                    icon: CreditCard,
                    subtext: t('dashboard.stats.active_subs_sub')
                }
            ],
            revenueHero: {
                title: t('dashboard.hero.mrr_agency'),
                value: <CountUp end={monthlyRecurring} duration={2} separator="," />,
                unit: "COP/mes",
                tips: t('dashboard.tips.agency') || []
            },
            social: {
                facebook: settings?.social_facebook,
                instagram: settings?.social_instagram,
                twitter: settings?.social_twitter,
                fbFollowers: settings?.social_facebook_followers,
                igFollowers: settings?.social_instagram_followers
            },
            quickActions: [
                { title: t('dashboard.actions.new_client'), icon: UserPlus, colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white", onClick: () => setIsClientModalOpen(true) },
                { title: t('dashboard.actions.new_quote'), icon: FilePlus, colorClass: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white", onClick: () => setIsQuoteModalOpen(true) },
                { title: t('dashboard.actions.new_brief'), icon: ClipboardCheck, colorClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white", onClick: () => setIsBriefingModalOpen(true) },
                { title: t('dashboard.actions.new_invoice'), icon: Receipt, colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white", onClick: () => setIsInvoiceModalOpen(true) }
            ],
            smartAlert: clientsWithOverdueMap.size > 0 ? {
                title: t('dashboard.alerts.attention_required'),
                message: <span>{clientsWithOverdueMap.size} {t('dashboard.alerts.clients_in_debt')}. <span className="font-bold text-gray-900">${totalOverdue.toLocaleString()}</span>.</span>,
                itemsHeading: t('dashboard.alerts.in_debt'),
                items: debtors
            } : undefined
        }

        setDashboardData(data)
    }

    // --- CLEANING ADAPTER (Enhanced) ---
    const loadCleaningData = async (orgId: string) => {
        const { getOperationsMetrics, getWeeklyRevenue } = await import("@/modules/core/work-orders/actions/operation-actions")
        const { getDashboardData } = await import("@/modules/core/dashboard/actions")

        const [metrics, revenueData, coreData] = await Promise.all([
            getOperationsMetrics(new Date().toISOString()),
            getWeeklyRevenue(),
            getDashboardData() // We still fetch this for settings/socials
        ])

        const totalRevenueWeek = revenueData.reduce((acc: any, curr: any) => acc + curr.revenue, 0)

        // Define Cleaning Actions that make sense
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
                onClick: () => window.location.href = '/cleaning' // Redirects to calendar view implicitly
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

        // Map pending jobs to Smart Alert if high
        let smartAlert = undefined
        if (metrics.pending > 0) {
            smartAlert = {
                title: t('dashboard.alerts.pending_ops'),
                message: <span>{t('dashboard.alerts.pending_ops_msg')}</span>,
                items: [], // We could fetch specific jobs/staff here if we wanted deeper integration
            }
        }

        const data: DashboardDataProps = {
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
            revenueHero: {
                title: t('dashboard.hero.revenue_7d'),
                value: <CountUp end={totalRevenueWeek} duration={2} separator="," />,
                unit: "COP",
                tips: t('dashboard.tips.cleaning') || []
            },
            social: {
                facebook: coreData.settings?.social_facebook,
                instagram: coreData.settings?.social_instagram,
                twitter: coreData.settings?.social_twitter,
                fbFollowers: coreData.settings?.social_facebook_followers,
                igFollowers: coreData.settings?.social_instagram_followers
            },
            quickActions: quickActions,
            smartAlert: smartAlert
        }
        setDashboardData(data)
    }

    if (loading) {
        return <GlobalLoader />
    }

    if (!dashboardData) return null

    return (
        <>
            <ModularDashboardLayout data={dashboardData} />

            {/* Global Modals */}
            <CreateClientSheet
                open={isClientModalOpen}
                onOpenChange={setIsClientModalOpen}
                trigger={<span className="hidden" />}
                onSuccess={() => { setIsClientModalOpen(false); loadDashboard() }}
            />
            <CreateQuoteSheet
                open={isQuoteModalOpen}
                onOpenChange={setIsQuoteModalOpen}
                trigger={<span className="hidden" />}
                onSuccess={() => { setIsQuoteModalOpen(false); loadDashboard() }}
            />
            <CreateFormSheet
                open={isBriefingModalOpen}
                onOpenChange={setIsBriefingModalOpen}
                onSuccess={() => setIsBriefingModalOpen(false)}
            />
            <CreateInvoiceSheet
                open={isInvoiceModalOpen}
                onOpenChange={setIsInvoiceModalOpen}
                trigger={<span className="hidden" />}
                onSuccess={() => { setIsInvoiceModalOpen(false); loadDashboard() }}
            />

            {/* Cleaning Modals */}
            <NewJobModal
                open={isNewJobModalOpen}
                onOpenChange={setIsNewJobModalOpen}
            />


            {/* Platform Modals */}
            <CreateOrganizationSheet
                open={isNewOrgModalOpen}
                onOpenChange={setIsNewOrgModalOpen}
                onSuccess={() => { setIsNewOrgModalOpen(false); loadDashboard() }}
            />
        </>
    )
}
