"use client"

import React, { useState } from "react"
import { Store, Users, AlertTriangle, ShieldCheck, UserPlus, MapPin, ClipboardCheck, Receipt } from "lucide-react"
import { ModularDashboardLayout, DashboardDataProps } from "@/modules/core/dashboard/modular-dashboard-layout"
import { useRegisterView } from "@/modules/core/caa/context/view-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

// Import Modals
import { CreateLeadSheet as CreateClientSheet } from "@/modules/features/crm/components/create-lead-sheet"
import { CreateQuoteSheet } from "@/modules/features/quotes/components/create-quote-sheet"
import { CreateInvoiceSheet } from "@/modules/features/billing/components/create-invoice-sheet"
import { CreateFormSheet } from "@/modules/features/forms/create-form-sheet"

interface RetailDashboardProps {
    dashboardData: any
    extraData: any
    userRole?: string | null
    onReload?: () => void
}

export function RetailDashboard({ dashboardData, extraData, userRole: initialRole, onReload }: RetailDashboardProps) {
    const { t } = useTranslation()
    const router = useRouter()
    const { settings } = dashboardData
    const { retailMetrics } = extraData

    // Modals internal state
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false)

    const refreshData = () => {
        router.refresh()
        if (onReload) onReload()
    }

    // CAA Registration (Context-Aware for Retail)
    useRegisterView({
        viewId: "dashboard",
        label: "Dashboard Retail",
        actions: [
            { id: "new-client", label: t('dashboard.actions.new_client'), type: "function", target: "open_client_modal", icon: UserPlus, description: t('dashboard.actions.new_client_desc') },
            { id: "new-invoice", label: "Nueva Factura", type: "function", target: "open_invoice_modal", icon: Receipt, description: t('dashboard.actions.new_invoice_desc') },
            { id: "attendance", label: "Gestión Asistencia", type: "route", target: "/attendance", icon: ClipboardCheck, description: "Ver asistencia del personal" }
        ]
    })

    const data: DashboardDataProps = {
        globalBannerConfig: dashboardData?.bannerConfig,
        agentStats: extraData?.agentStats,
        stats: [
            {
                title: "Operómetro Retail",
                value: (
                    <div className="flex items-baseline gap-2">
                        <span>{retailMetrics.activeLocations}</span>
                        <span className="text-sm font-normal text-muted-foreground">/ {retailMetrics.totalLocations} Sedes Activas</span>
                    </div>
                ),
                icon: Store,
                subtext: (
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-none font-bold py-0 h-5">
                            {retailMetrics.staffOnSite} Staff en sitio
                        </Badge>
                        {retailMetrics.activeLocations < retailMetrics.totalLocations && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-none font-bold py-0 h-5">
                                Faltan sedes
                            </Badge>
                        )}
                    </div>
                )
            },
            {
                title: "Alertas de Seguridad",
                value: retailMetrics.alerts,
                icon: AlertTriangle,
                subtext: (
                    <span className={retailMetrics.alerts > 0 ? "text-red-500 font-bold" : "text-emerald-500"}>
                        {retailMetrics.alerts > 0 ? "Anomalías detectadas hoy" : "Todo bajo control"}
                    </span>
                )
            },
            {
                title: "Estado de Protección",
                value: "Activo",
                icon: ShieldCheck,
                subtext: "Validación Zero-Trust activa"
            }
        ],
        social: {
            title: "Retail/Space",
            facebook: settings?.social_facebook,
            instagram: settings?.social_instagram,
            twitter: settings?.social_twitter,
        },
        quickActions: [
            { title: t('dashboard.actions.new_client'), icon: UserPlus, colorClass: "bg-brand-cyan/10 text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white", onClick: () => setIsClientModalOpen(true) },
            { title: "Gestión Asistencia", icon: ClipboardCheck, colorClass: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white", onClick: () => window.location.href = "/attendance" },
            { title: "Ficha de Sedes", icon: MapPin, colorClass: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white", onClick: () => window.location.href = "/attendance" },
            { title: "Nueva Factura", icon: Receipt, colorClass: "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink group-hover:text-white", onClick: () => setIsInvoiceModalOpen(true) }
        ],
        smartAlert: retailMetrics.alerts > 0 ? {
            title: "Atención Requerida",
            message: <span>Se han detectado {retailMetrics.alerts} anomalías en las marcaciones de hoy.</span>,
            itemsHeading: "Sedes con alertas",
            items: [] // Podriamos poblar esto si quisiéramos más detalle
        } : undefined
    }

    return (
        <>
            <ModularDashboardLayout data={data} userRole={initialRole} />
            <CreateClientSheet open={isClientModalOpen} onOpenChange={setIsClientModalOpen} onSuccess={() => { setIsClientModalOpen(false); refreshData() }} />
            <CreateQuoteSheet open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen} onSuccess={() => { setIsQuoteModalOpen(false); refreshData() }} />
            <CreateFormSheet open={isBriefingModalOpen} onOpenChange={setIsBriefingModalOpen} onSuccess={() => setIsBriefingModalOpen(false)} />
            <CreateInvoiceSheet open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen} onSuccess={() => { setIsInvoiceModalOpen(false); refreshData() }} />
        </>
    )
}

