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
    CheckCircle2,
    Landmark,
    FileText,
    ShieldCheck
} from "lucide-react"
import CountUp from "react-countup"
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { useRegisterView } from "@/modules/features/caa/context/view-context"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { useRouter } from "next/navigation"

// Import Specialized Modals & Sheets
import { CreateClientSheet } from "@/modules/features/crm/components/create-client-sheet"
import { CatalogItemFormSheet } from "@/modules/features/catalog/components/catalog-item-form-sheet"
import { LeaseFormSheet } from "@/modules/features/rentals/components/lease-form-sheet"
import { RentFlowCollectionGauge } from "./rentflow-collection-gauge"

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
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false)
    const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false)

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
                label: "Publicar Inmueble",
                type: "function",
                target: "open_property_modal",
                icon: Building2,
                description: "Publicar una nueva propiedad o inmueble en catálogo"
            },
            {
                id: "new-lease",
                label: "Nuevo Contrato",
                type: "function",
                target: "open_lease_modal",
                icon: Key,
                description: "Registrar un nuevo contrato de arrendamiento en RentFlow"
            },
            {
                id: "new-lead",
                label: "Registrar Contacto",
                type: "function",
                target: "open_client_modal",
                icon: UserPlus,
                description: "Registrar inquilino, propietario, fiador o comprador"
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
        rentPropertiesCount: 0,
        salePropertiesCount: 0,
        occupancyRate: 0,
        totalExpectedRent: 0,
        grossCollected: 0,
        collectionRate: 0,
        lateAmount: 0,
        pendingAmount: 0,
        netOwnerPayout: 0,
        agencyCommissions: 0,
        activeLeasesCount: 0,
        upcomingRenewalsCount: 0,
    }

    const data: DashboardDataProps = {
        globalBannerConfig: bannerConfig || dashboardData?.bannerConfig,
        agentStats: extraData?.agentStats,
        stats: [
            {
                title: "Portafolio & Ocupación",
                value: (
                    <div className="flex items-baseline gap-2">
                        <span>{metrics.activePropertiesCount}</span>
                        {metrics.totalPropertiesCount > 0 && (
                            <span className="text-sm font-normal text-muted-foreground">
                                / {metrics.totalPropertiesCount} Inmuebles
                            </span>
                        )}
                    </div>
                ),
                icon: Building2,
                subtext: (
                    <span className="text-muted-foreground font-normal">
                        {metrics.rentPropertiesCount || 0} arriendo <span className="text-emerald-600 dark:text-emerald-400 font-medium">({metrics.occupancyRate || 0}% ocupación)</span> · {metrics.salePropertiesCount || 0} venta
                    </span>
                ),
                gradientColor: "var(--primary)"
            },
            {
                title: "Recaudo del Mes",
                value: (
                    <CountUp
                        end={metrics.grossCollected || 0}
                        duration={1.5}
                        separator="."
                        prefix="$ "
                    />
                ),
                icon: DollarSign,
                subtext: (
                    <span className="text-muted-foreground font-normal">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{metrics.collectionRate || 0}% al día</span> · {metrics.lateAmount > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">$ {Math.round(metrics.lateAmount).toLocaleString('es-CO')} en mora</span>
                        ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">0 en mora</span>
                        )}
                    </span>
                ),
                gradientColor: "var(--primary)"
            },
            {
                title: "Dispersión a Propietarios",
                value: (
                    <CountUp
                        end={metrics.netOwnerPayout || 0}
                        duration={1.5}
                        separator="."
                        prefix="$ "
                    />
                ),
                icon: Landmark,
                subtext: (
                    <span className="text-muted-foreground font-normal">
                        Comisión neta: <span className="font-semibold text-gray-800 dark:text-gray-200">$ {Math.round(metrics.agencyCommissions || 0).toLocaleString('es-CO')}</span> (8%+IVA)
                    </span>
                ),
                gradientColor: "var(--primary)"
            },
            {
                title: "Contratos Vigentes",
                value: (
                    <div className="flex items-baseline gap-2">
                        <span>{metrics.activeLeasesCount || 0}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                            Activos
                        </span>
                    </div>
                ),
                icon: Key,
                subtext: metrics.upcomingRenewalsCount > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {metrics.upcomingRenewalsCount} {metrics.upcomingRenewalsCount === 1 ? 'vencimiento próximo' : 'vencimientos próximos'} (60 días)
                    </span>
                ) : (
                    <span className="text-muted-foreground font-normal">
                        Contratos al día sin vencimientos
                    </span>
                ),
                gradientColor: "var(--primary)"
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
                title: "Publicar Inmueble",
                icon: Building2,
                colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white",
                onClick: () => setIsPropertyModalOpen(true)
            },
            {
                title: "Nuevo Contrato",
                icon: Key,
                colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white",
                onClick: () => setIsLeaseModalOpen(true)
            },
            {
                title: "Registrar Contacto",
                icon: UserPlus,
                colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white",
                onClick: () => setIsClientModalOpen(true)
            },
            {
                title: "Cobranza & Dispersión",
                icon: Receipt,
                colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
                onClick: () => router.push('/rentals')
            },
            {
                title: "Tienda / Portal",
                icon: Home,
                colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white",
                onClick: () => router.push('/tienda')
            }
        ]
    }

    return (
        <>
            <ModularDashboardLayout data={data} userRole={initialRole}>
                {/* Semáforo de Cobranza Mensual en Vivo */}
                <div className="pt-2 pb-1">
                    <RentFlowCollectionGauge
                        totalExpectedRent={metrics.totalExpectedRent}
                        grossCollected={metrics.grossCollected}
                        collectionRate={metrics.collectionRate}
                        lateAmount={metrics.lateAmount}
                        pendingAmount={metrics.pendingAmount}
                        currentPeriod={metrics.currentPeriod}
                    />
                </div>
            </ModularDashboardLayout>

            <CreateClientSheet
                open={isClientModalOpen}
                onOpenChange={setIsClientModalOpen}
                spaceType="real_estate"
                onSuccess={() => {
                    setIsClientModalOpen(false)
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
            <LeaseFormSheet
                open={isLeaseModalOpen}
                onOpenChange={setIsLeaseModalOpen}
                properties={dashboardData?.catalog || []}
                contacts={dashboardData?.leads || []}
                onSuccess={() => {
                    setIsLeaseModalOpen(false)
                    refreshData()
                }}
            />
        </>
    )
}
