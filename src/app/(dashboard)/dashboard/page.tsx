"use client"

import { useEffect, useState, Suspense } from "react"
import dynamic from "next/dynamic"
import { DashboardSkeleton } from "@/modules/core/dashboard/dashboard-skeleton"

// Lazy loaded vertical dashboards
const AgencyDashboard = dynamic(() => import("@/modules/core/dashboard/components/agency-dashboard").then(m => m.AgencyDashboard), { loading: () => <DashboardSkeleton /> })
const CleaningDashboard = dynamic(() => import("@/modules/core/dashboard/components/cleaning-dashboard").then(m => m.CleaningDashboard), { loading: () => <DashboardSkeleton /> })
const ResellerDashboard = dynamic(() => import("@/modules/core/dashboard/components/reseller-dashboard").then(m => m.ResellerDashboard), { loading: () => <DashboardSkeleton /> })
const RestoDashboard = dynamic(() => import("@/modules/core/dashboard/components/resto-dashboard").then(m => m.RestoDashboard), { loading: () => <DashboardSkeleton /> })
const RetailDashboard = dynamic(() => import("@/modules/core/dashboard/components/retail-dashboard").then(m => m.RetailDashboard), { loading: () => <DashboardSkeleton /> })
const DefaultDashboard = dynamic(() => import("@/modules/core/dashboard/components/default-dashboard").then(m => m.DefaultDashboard), { loading: () => <DashboardSkeleton /> })

// Interceptores Globales del Dashboard Original
import { useTranslation } from "@/lib/i18n/use-translation"
import { UserPlus, FilePlus, Receipt, TrendingUp } from "lucide-react"

export default function DashboardPage() {
    const { t } = useTranslation()
    const [payload, setPayload] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // CAA Registration (Global context commands) removed from here
    // Moved to individual dashboards for context-awareness

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

    const { orgType, dashboardData, extraData, userRole } = payload

    return (
        <div className="flex flex-col w-full h-full">

            {/* 
              Motor de Enrutamiento Pluggable de Carga Ligera: 
              Evita que el restaurante tenga que descargar JS de facturación B2B o el Reseller de catálogos B2C. 
            */}
            <Suspense fallback={<DashboardSkeleton />}>
                {orgType === 'agency' && <AgencyDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} onReload={loadDashboard} />}
                {orgType === 'cleaning' && <CleaningDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} onReload={loadDashboard} />}
                {orgType === 'reseller' && <ResellerDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} onReload={loadDashboard} />}
                {orgType === 'resto' && <RestoDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} onReload={loadDashboard} />}
                {orgType === 'retail' && <RetailDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} onReload={loadDashboard} />}
                {orgType === 'saas' && <DefaultDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} onReload={loadDashboard} />}

                {/* Fallback de Seguridad en caso de que un workspace huérfano llegue hasta acá */}
                {!['agency', 'cleaning', 'reseller', 'resto', 'retail', 'saas'].includes(orgType) && (
                    <AgencyDashboard dashboardData={dashboardData} extraData={extraData} onReload={loadDashboard} />
                )}
            </Suspense>
        </div>
    )
}
