"use client"

import { useEffect, useState, Suspense } from "react"
import { GlobalDashboardBanner } from "@/modules/core/dashboard/components/global-dashboard-banner"
import { AgencyDashboard } from "@/modules/core/dashboard/components/agency-dashboard"
import { CleaningDashboard } from "@/modules/core/dashboard/components/cleaning-dashboard"
import { ResellerDashboard } from "@/modules/core/dashboard/components/reseller-dashboard"
import { RestoDashboard } from "@/modules/core/dashboard/components/resto-dashboard"
import { DashboardSkeleton } from "@/modules/core/dashboard/dashboard-skeleton"

// Interceptores Globales del Dashboard Original
import { useRegisterView } from "@/modules/core/caa/context/view-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import { UserPlus, FilePlus, Receipt, TrendingUp } from "lucide-react"

export default function DashboardPage() {
    const { t } = useTranslation()
    const [payload, setPayload] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // CAA Registration (Global context commands)
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
        setLoading(true)
        try {
            const { getDashboardPayload } = await import("@/modules/core/dashboard/actions")
            const data = await getDashboardPayload()
            setPayload(data)
        } catch (error) {
            console.error("Dashboard Load Error", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || !payload) {
        return <DashboardSkeleton />
    }

    const { orgType, dashboardData, extraData } = payload

    return (
        <div className="flex flex-col w-full h-full">
            {/* Banner Global Preparado para pautas / avisos en todos los tenants */}
            <GlobalDashboardBanner />

            {/* 
              Motor de Enrutamiento Pluggable de Carga Ligera: 
              Evita que el restaurante tenga que descargar JS de facturación B2B o el Reseller de catálogos B2C. 
            */}
            <Suspense fallback={<DashboardSkeleton />}>
                {orgType === 'agency' && <AgencyDashboard dashboardData={dashboardData} extraData={extraData} onReload={loadDashboard} />}
                {orgType === 'cleaning' && <CleaningDashboard dashboardData={dashboardData} extraData={extraData} onReload={loadDashboard} />}
                {orgType === 'reseller' && <ResellerDashboard dashboardData={dashboardData} extraData={extraData} onReload={loadDashboard} />}
                {orgType === 'resto' && <RestoDashboard dashboardData={dashboardData} extraData={extraData} onReload={loadDashboard} />}

                {/* Fallback de Seguridad en caso de que un workspace huérfano llegue hasta acá */}
                {!['agency', 'cleaning', 'reseller', 'resto'].includes(orgType) && (
                    <AgencyDashboard dashboardData={dashboardData} extraData={extraData} onReload={loadDashboard} />
                )}
            </Suspense>
        </div>
    )
}
