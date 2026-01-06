"use client"

import { useEffect, useState } from "react"
import { Users, DollarSign, FileText, CreditCard, TrendingUp, AlertCircle, UserPlus, FilePlus, ClipboardCheck, Receipt, Sparkles, Calendar, PlayCircle, CheckCircle2, Clock, Building2 } from "lucide-react"
import CountUp from "react-countup"

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

const AGENCY_TIPS = [
    "Fideliza a tus clientes: Un servicio post-venta excepcional puede incrementar el LTV hasta en un 40%.",
    "Optimiza tu flujo de caja: Automatiza los recordatorios de pago para reducir drásticamente la morosidad.",
    "Escala inteligentemente: Documenta tus procesos operativos para delegar sin perder calidad en la entrega.",
    "Valor sobre precio: Enfócate en comunicar el ROI que generas, no en las horas operativas que trabajas.",
    "La especialización es clave: Definir un nicho de mercado claro te permite cobrar tarifas premium."
]

const CLEANING_TIPS = [
    "La puntualidad es tu mejor marketing: Un equipo a tiempo genera 50% más retención.",
    "Revisa los insumos semanalmente para evitar paradas operativas.",
    "Capacita a tu personal en atención al cliente, no solo en limpieza.",
    "Ofrece servicios recurrentes con descuento para asegurar flujo de caja.",
    "Documenta el 'antes y después' para portafolio visual."
]

export default function DashboardPage() {
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
                    title: "Tenants Activos",
                    value: tenantCount || 0,
                    icon: Building2,
                    subtext: "Clientes SaaS gestionados"
                },
                {
                    title: "Ingresos Totales",
                    value: <CountUp end={totalRevenue} duration={2} separator="," prefix="$" />,
                    icon: DollarSign,
                    subtext: "Facturado a clientes"
                },
                {
                    title: "Por Cobrar",
                    value: <CountUp end={pendingPayments} duration={2} separator="," prefix="$" />,
                    icon: AlertCircle,
                    subtext: "Saldo pendiente"
                },
                {
                    title: "Ticket Promedio",
                    value: <CountUp end={(tenantCount ?? 0) > 0 ? totalRevenue / (tenantCount ?? 1) : 0} duration={2} separator="," prefix="$" />,
                    icon: CreditCard,
                    subtext: "Ingreso por Tenant (ARPU)"
                }
            ],
            revenueHero: {
                title: "Ingresos Recurrentes (SaaS)",
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
                { title: "Nuevo Tenant", icon: Building2, colorClass: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white", onClick: () => setIsNewOrgModalOpen(true) },
                { title: "Nuevo Cliente", icon: UserPlus, colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white", onClick: () => setIsClientModalOpen(true) },
                { title: "Nueva Cotización", icon: FilePlus, colorClass: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white", onClick: () => setIsQuoteModalOpen(true) },
                { title: "Nuevo Brief", icon: ClipboardCheck, colorClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white", onClick: () => setIsBriefingModalOpen(true) },
                { title: "Nueva Factura", icon: Receipt, colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white", onClick: () => setIsInvoiceModalOpen(true) }
            ],
            smartAlert: clientsWithOverdueMap.size > 0 ? {
                title: "Atención Requerida (Cartera)",
                message: <span>Hay <span className="font-bold text-red-500">{clientsWithOverdueMap.size} clientes/tenants</span> con cuentas vencidas. Total: <span className="font-bold text-gray-900">${totalOverdue.toLocaleString()}</span>.</span>,
                itemsHeading: "En Mora",
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
                    title: "Total Clientes",
                    value: clients.length,
                    icon: Users,
                    subtext: clientsWithPendingSet.size > 0
                        ? <span className="text-indigo-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {clientsWithPendingSet.size} con saldo pendiente</span>
                        : <span className="text-green-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Todos al día</span>
                },
                {
                    title: "Ingresos Totales",
                    value: <CountUp end={totalRevenue} duration={2} separator="," prefix="$" />,
                    icon: DollarSign,
                    subtext: `${paidInvoicesCount} documentos pagados`
                },
                {
                    title: "Por Cobrar",
                    value: <CountUp end={pendingPayments} duration={2} separator="," prefix="$" />,
                    icon: AlertCircle,
                    subtext: "Pendientes (Vencidas + En tiempo)"
                },
                {
                    title: "Suscripciones Activas",
                    value: activeSubscriptions,
                    icon: CreditCard,
                    subtext: "Servicios recurrentes"
                }
            ],
            revenueHero: {
                title: "Ingresos Recurrentes Mensuales (MRR)",
                value: <CountUp end={monthlyRecurring} duration={2} separator="," />,
                unit: "COP/mes",
                tips: AGENCY_TIPS
            },
            social: {
                facebook: settings?.social_facebook,
                instagram: settings?.social_instagram,
                twitter: settings?.social_twitter,
                fbFollowers: settings?.social_facebook_followers,
                igFollowers: settings?.social_instagram_followers
            },
            quickActions: [
                { title: "Nuevo Cliente", icon: UserPlus, colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white", onClick: () => setIsClientModalOpen(true) },
                { title: "Nueva Cotización", icon: FilePlus, colorClass: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white", onClick: () => setIsQuoteModalOpen(true) },
                { title: "Nuevo Brief", icon: ClipboardCheck, colorClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white", onClick: () => setIsBriefingModalOpen(true) },
                { title: "Nueva Factura", icon: Receipt, colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white", onClick: () => setIsInvoiceModalOpen(true) }
            ],
            smartAlert: clientsWithOverdueMap.size > 0 ? {
                title: "Atención Requerida",
                message: <span>Hay <span className="font-bold text-red-500">{clientsWithOverdueMap.size} clientes</span> con cuentas de cobro vencidas. Gestionar estos cobros podría recuperar <span className="font-bold text-gray-900">${totalOverdue.toLocaleString()}</span>.</span>,
                itemsHeading: "Clientes en Mora",
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
                title: "Nuevo Trabajo",
                icon: Sparkles,
                colorClass: "bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white",
                onClick: () => setIsNewJobModalOpen(true)
            },
            {
                title: "Ver Calendario",
                icon: Calendar,
                colorClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
                onClick: () => window.location.href = '/cleaning' // Redirects to calendar view implicitly
            },
            {
                title: "Personal",
                icon: Users,
                colorClass: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
                onClick: () => window.location.href = '/cleaning?tab=staff'
            },
            {
                title: "Nuevo Cliente",
                icon: UserPlus,
                colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white",
                onClick: () => setIsClientModalOpen(true)
            }
        ]

        // Map pending jobs to Smart Alert if high
        let smartAlert = undefined
        if (metrics.pending > 0) {
            smartAlert = {
                title: "Operaciones Pendientes",
                message: <span>Tienes <span className="font-bold text-orange-500">{metrics.pending} trabajos</span> pendientes de iniciar o asignar hoy.</span>,
                items: [], // We could fetch specific jobs/staff here if we wanted deeper integration
            }
        }

        const data: DashboardDataProps = {
            stats: [
                {
                    title: "Trabajos Hoy",
                    value: metrics.total,
                    icon: Calendar,
                    subtext: "Total programados"
                },
                {
                    title: "En Curso",
                    value: metrics.in_progress,
                    icon: PlayCircle,
                    gradientColor: "#F97316",
                    subtext: "Servicios activos ahora"
                },
                {
                    title: "Pendientes",
                    value: metrics.pending,
                    icon: Clock,
                    gradientColor: "#EAB308",
                    subtext: "Por iniciar o asignar"
                },
                {
                    title: "Completados",
                    value: metrics.completed,
                    icon: CheckCircle2,
                    gradientColor: "#22C55E",
                    subtext: "Finalizados hoy"
                }
            ],
            revenueHero: {
                title: "Ingresos (Últimos 7 Días)",
                value: <CountUp end={totalRevenueWeek} duration={2} separator="," />,
                unit: "COP",
                tips: CLEANING_TIPS
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
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
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
