"use client"

import { PortalAccessWidget } from "./portal-access-widget"
import { GlobalDashboardBanner } from "./global-dashboard-banner"
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { useRegisterView } from "@/modules/core/caa/context/view-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Utensils, QrCode, ClipboardList, TrendingUp } from "lucide-react"

interface RestoDashboardProps {
    dashboardData: any
    extraData: any
    onReload: () => void
}

export function RestoDashboard({ dashboardData, extraData, onReload }: RestoDashboardProps) {
    const { t } = useTranslation()
    const { orgDetails } = extraData || {}
    const bannerConfig = dashboardData?.bannerConfig

    // Configurar URL del portal público
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/portal/${orgDetails?.slug}` : `https://pixy.do/portal/${orgDetails?.slug}`

    // CAA Registration (Context-Aware for Resto)
    useRegisterView({
        viewId: "dashboard",
        label: "Dashboard Resto",
        topics: ["resto-intro", "digital-menu-guide"],
        actions: [
            { id: "new-order", label: "Nuevo Pedido", type: "function", target: "open_order_modal", icon: ClipboardList, description: "Registrar un pedido manual" },
            { id: "view-menu", label: "Ver Menú Digital", type: "route", target: portalUrl, icon: QrCode, description: "Abrir el portal del restaurante" }
        ]
    })

    const data: DashboardDataProps = {
        globalBannerConfig: bannerConfig,
        stats: [
            {
                title: "Ventas Hoy",
                value: "$0",
                icon: Utensils,
                subtext: <span className="text-gray-400">Próximamente</span>
            },
            {
                title: "Pedidos Activos",
                value: "0",
                icon: ClipboardList,
                subtext: <span className="text-gray-400">Próximamente</span>
            }
        ],
        social: {
            title: "Resto/Space",
            facebook: dashboardData?.settings?.social_facebook,
            instagram: dashboardData?.settings?.social_instagram,
            twitter: dashboardData?.settings?.social_twitter,
        },
        quickActions: [
            { title: "Ver Menú Digital", icon: QrCode, colorClass: "bg-brand-cyan/10 text-brand-cyan", onClick: () => window.open(portalUrl, "_blank") },
            { title: "Nuevo Pedido", icon: ClipboardList, colorClass: "bg-indigo-50 text-indigo-600", onClick: () => {} },
        ],
        smartAlert: {
            title: "Restaurante en Configuración",
            message: "Tu portal digital ya está activo. Escanea el código QR para verlo.",
            itemsHeading: "Acciones Recomendadas",
            items: [
                { id: "qr", name: "Descargar Código QR", value: 0 }
            ]
        }
    }

    return (
        <div className="space-y-8 pb-24">
            <ModularDashboardLayout data={data} />
            
            {/* Custom Resto Widget */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <PortalAccessWidget url={portalUrl} orgName={orgDetails?.name || "Catálogo"} />
            </div>
        </div>
    )
}
