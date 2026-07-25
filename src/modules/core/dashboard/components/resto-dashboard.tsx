"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { 
    UtensilsCrossed, QrCode, ClipboardList, ChefHat, Map, 
    Truck, CircleDollarSign, Printer
} from "lucide-react"
import { PortalAccessWidget } from "./portal-access-widget"
import { TablesQrModal } from "./tables-qr-modal"
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { useRegisterView } from "@/modules/features/caa/context/view-context"
import { useTranslation } from "@/modules/core/i18n/use-translation"

interface RestoDashboardProps {
    dashboardData: any
    extraData: any
    userRole?: string | null
    onReload?: () => void
}

export function RestoDashboard({ dashboardData, extraData, userRole: initialRole }: RestoDashboardProps) {
    const { t } = useTranslation()
    const router = useRouter()
    const [showTablesQrModal, setShowTablesQrModal] = useState(false)

    const { orgDetails, restoMetrics, tables } = extraData || {}
    const bannerConfig = dashboardData?.bannerConfig

    const portalUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/portal/${orgDetails?.slug || orgDetails?.id}` 
        : `https://pixy.do/portal/${orgDetails?.slug || orgDetails?.id}`

    // Register CAA View Context
    useRegisterView({
        viewId: "dashboard-resto",
        label: "Dashboard Resto",
        actions: [
            { id: "gestor-pedidos", label: "Gestor de Pedidos", type: "route", target: "/resto-orders", icon: ClipboardList, description: "Ver lista de comandas" },
            { id: "qrs-mesas", label: "QRs de Mesas", type: "function", target: "open_tables_qr_modal", icon: Printer, description: "Descargar QRs individuales por mesa" },
            { id: "mapa-mesas", label: "Mapa de Mesas", type: "route", target: "/resto-orders?view=map", icon: Map, description: "Ver estado de salas" },
            { id: "kds-cocina", label: "Pantalla KDS", type: "route", target: "/resto-orders?view=kds", icon: ChefHat, description: "Tablero de cocina" },
            { id: "view-menu", label: "Ver Menú Digital", type: "route", target: portalUrl, icon: QrCode, description: "Abrir portal del cliente" }
        ]
    })

    const metrics = restoMetrics || {
        todayPaidSales: 0,
        activeOrdersCount: 0,
        deliveryCount: 0,
        dineInCount: 0,
        pickupCount: 0,
        totalTables: 0,
        occupiedTablesCount: 0,
        billingTablesCount: 0,
        availableTablesCount: 0,
        todayOrdersCount: 0
    }

    const allTables = tables || []

    // Configure standardized ModularDashboardLayout data props
    const data: DashboardDataProps = {
        globalBannerConfig: bannerConfig,
        stats: [
            {
                title: "Ventas de Hoy",
                value: `$${metrics.todayPaidSales.toLocaleString('es-CO')}`,
                icon: CircleDollarSign,
                subtext: <span>{metrics.todayOrdersCount} {metrics.todayOrdersCount === 1 ? 'pedido cobrado hoy' : 'pedidos cobrados hoy'}</span>,
                gradientColor: "var(--brand-pink)"
            },
            {
                title: "Pedidos Activos",
                value: `${metrics.activeOrdersCount}`,
                icon: ChefHat,
                subtext: <span className="text-orange-600 dark:text-orange-400 font-semibold">En cocina o listos</span>,
                gradientColor: "rgba(249, 115, 22, 0.4)"
            },
            {
                title: "Ocupación de Mesas",
                value: `${metrics.occupiedTablesCount} / ${metrics.totalTables}`,
                icon: UtensilsCrossed,
                subtext: <span>{metrics.billingTablesCount} {metrics.billingTablesCount === 1 ? 'mesa pidiendo cuenta' : 'mesas pidiendo cuenta'}</span>,
                gradientColor: "var(--brand-pink)"
            },
            {
                title: "Domicilios & Pickup",
                value: `${metrics.deliveryCount} Domis · ${metrics.pickupCount} Llevar`,
                icon: Truck,
                subtext: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Envíos digitales hoy</span>,
                gradientColor: "rgba(99, 102, 241, 0.4)"
            }
        ],
        quickActions: [
            {
                title: "Ver Menú Digital",
                icon: QrCode,
                colorClass: "bg-brand-cyan/10 text-brand-cyan",
                onClick: () => window.open(portalUrl, "_blank")
            },
            {
                title: "Gestor de Pedidos",
                icon: ClipboardList,
                colorClass: "bg-brand-pink/10 text-brand-pink",
                onClick: () => router.push('/resto-orders')
            },
            {
                title: "QRs de Mesas",
                icon: Printer,
                colorClass: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
                onClick: () => setShowTablesQrModal(true)
            },
            {
                title: "Mapa de Mesas",
                icon: Map,
                colorClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                onClick: () => router.push('/resto-orders?view=map')
            },
            {
                title: "KDS Cocina",
                icon: ChefHat,
                colorClass: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
                onClick: () => router.push('/resto-orders?view=kds')
            }
        ],
        social: {
            companyName: dashboardData?.settings?.agency_name || orgDetails?.name || "Restaurante",
            facebook: "https://www.facebook.com/pixyspaces",
            instagram: "https://www.instagram.com/pixyspaces/",
            whatsapp: "https://wa.me/573504076800",
        }
    }

    return (
        <div className="space-y-8 pb-24 animate-in fade-in duration-500">
            {/* Standardized Modular Dashboard Layout */}
            <ModularDashboardLayout data={data} userRole={initialRole} />

            {/* QR Code & Portal Access Widget (General Menu) */}
            <div className="pt-2">
                <PortalAccessWidget url={portalUrl} orgName={orgDetails?.name || "Restaurante"} />
            </div>

            {/* Tables QR Modal */}
            {showTablesQrModal && (
                <TablesQrModal
                    tables={allTables}
                    portalUrl={portalUrl}
                    orgName={orgDetails?.name || "Restaurante"}
                    onClose={() => setShowTablesQrModal(false)}
                />
            )}
        </div>
    )
}
