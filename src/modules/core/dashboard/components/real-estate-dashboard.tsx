"use client"

import React, { useState } from "react"
import {
    Building2,
    Users,
    Calendar,
    DollarSign,
    UserPlus,
    Plus,
    Home,
    Receipt,
    TrendingUp,
    Key,
    Clock,
    Sparkles,
    CheckCircle2
} from "lucide-react"
import CountUp from "react-countup"
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { useRegisterView } from "@/modules/features/caa/context/view-context"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { useRouter } from "next/navigation"

// Import Modals
import { CreateLeadSheet as CreateClientSheet } from "@/modules/features/crm/components/create-lead-sheet"
import { CreateQuoteSheet } from "@/modules/features/quotes/components/create-quote-sheet"
import { CreateInvoiceSheet } from "@/modules/features/billing/components/create-invoice-sheet"
import { CatalogItemFormSheet } from "@/modules/features/catalog/components/catalog-item-form-sheet"

export interface RealEstateDashboardProps {
    dashboardData: any
    extraData: any
    userRole?: string | null
    onReload?: () => void
}

export function RealEstateDashboard({
    dashboardData,
    extraData,
    userRole: initialRole,
    onReload
}: RealEstateDashboardProps) {
    const { t } = useTranslation()
    const router = useRouter()

    const { settings, bannerConfig } = dashboardData || {}
    const { orgDetails, realEstateMetrics } = extraData || {}

    // Modals internal state
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false)

    const refreshData = () => {
        router.refresh()
        if (onReload) onReload()
    }

    // Register CAA View Context for Real Estate Space
    useRegisterView({
        viewId: "dashboard-real-estate",
        label: "Dashboard PropTech & Inmobiliaria",
        actions: [
            {
                id: "new-property",
                label: "Nueva Propiedad",
                type: "function",
                target: "open_property_modal",
                icon: Building2,
                description: "Publicar una nueva propiedad o inmueble"
            },
            {
                id: "new-lead",
                label: "Registrar Prospecto",
                type: "function",
                target: "open_client_modal",
                icon: UserPlus,
                description: "Registrar cliente comprador o arrendatario"
            },
            {
                id: "schedule-visit",
                label: "Agendar Visita",
                type: "function",
                target: "open_quote_modal",
                icon: Calendar,
                description: "Agendar visita técnica o comercial a un inmueble"
            },
            {
                id: "view-portfolio",
                label: "Ver Portafolio",
                type: "route",
                target: "/portfolio",
                icon: Home,
                description: "Explorar catálogo de propiedades"
            }
        ]
    })

    const metrics = realEstateMetrics || {
        activePropertiesCount: 0,
        totalPropertiesCount: 0,
        portfolioValue: 0,
        buyerLeadsCount: 0,
        propertyVisitsCount: 0,
        quotesCount: 0
    }

    const data: DashboardDataProps = {
        globalBannerConfig: bannerConfig || dashboardData?.bannerConfig,
        agentStats: extraData?.agentStats,
        stats: [
            {
                title: "Propiedades Activas",
                value: (
                    <div className="flex items-baseline gap-2">
                        <span>{metrics.activePropertiesCount}</span>
                        {metrics.totalPropertiesCount > 0 && (
                            <span className="text-sm font-normal text-muted-foreground">
                                / {metrics.totalPropertiesCount} Total
                            </span>
                        )}
                    </div>
                ),
                icon: Building2,
                subtext: (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Inmuebles en oferta activa
                    </span>
                ),
                gradientColor: "var(--brand-pink)"
            },
            {
                title: "Leads de Compradores",
                value: metrics.buyerLeadsCount,
                icon: Users,
                subtext: (
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        Prospectos calificados
                    </span>
                ),
                gradientColor: "rgba(99, 102, 241, 0.4)"
            },
            {
                title: "Visitas / Contactos",
                value: metrics.propertyVisitsCount,
                icon: Calendar,
                subtext: (
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Citas y solicitudes recibidas
                    </span>
                ),
                gradientColor: "rgba(6, 182, 212, 0.4)"
            },
            {
                title: "Valor del Portafolio",
                value: (
                    <CountUp
                        end={metrics.portfolioValue || 0}
                        duration={2}
                        separator=","
                        prefix="$"
                    />
                ),
                icon: DollarSign,
                subtext: (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Valor consolidado en oferta
                    </span>
                ),
                gradientColor: "rgba(234, 179, 8, 0.4)"
            }
        ],
        social: {
            companyName: settings?.agency_name || orgDetails?.name || "Inmobiliaria",
            facebook: "https://www.facebook.com/pixyspaces",
            instagram: "https://www.instagram.com/pixyspaces/",
            whatsapp: "https://wa.me/573504076800",
        },
        quickActions: [
            {
                title: "Nueva Propiedad",
                icon: Building2,
                colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white",
                onClick: () => setIsPropertyModalOpen(true)
            },
            {
                title: "Registrar Prospecto",
                icon: UserPlus,
                colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white",
                onClick: () => setIsClientModalOpen(true)
            },
            {
                title: "Agendar Visita",
                icon: Calendar,
                colorClass: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white",
                onClick: () => setIsQuoteModalOpen(true)
            },
            {
                title: "Portafolio Inmuebles",
                icon: Home,
                colorClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
                onClick: () => router.push('/portfolio')
            },
            {
                title: "Nueva Factura",
                icon: Receipt,
                colorClass: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white",
                onClick: () => setIsInvoiceModalOpen(true)
            }
        ]
    }

    return (
        <>
            <ModularDashboardLayout data={data} userRole={initialRole} />
            <CreateClientSheet
                open={isClientModalOpen}
                onOpenChange={setIsClientModalOpen}
                onSuccess={() => {
                    setIsClientModalOpen(false)
                    refreshData()
                }}
            />
            <CreateQuoteSheet
                open={isQuoteModalOpen}
                onOpenChange={setIsQuoteModalOpen}
                onSuccess={() => {
                    setIsQuoteModalOpen(false)
                    refreshData()
                }}
            />
            <CatalogItemFormSheet
                open={isPropertyModalOpen}
                onOpenChange={setIsPropertyModalOpen}
                onSuccess={async () => {
                    setIsPropertyModalOpen(false)
                    refreshData()
                }}
                spaceType="real_estate"
                industryPreset="real_estate"
                organizationId={orgDetails?.id}
            />
            <CreateInvoiceSheet
                open={isInvoiceModalOpen}
                onOpenChange={setIsInvoiceModalOpen}
                onSuccess={() => {
                    setIsInvoiceModalOpen(false)
                    refreshData()
                }}
            />
        </>
    )
}
