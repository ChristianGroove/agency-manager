import { Suspense } from "react"
import dynamic from "next/dynamic"
import { DashboardSkeleton } from "@/modules/core/dashboard/dashboard-skeleton"
import { getDashboardPayload } from "@/modules/core/dashboard/dashboard-actions"

// Vertical dashboards are Client Components (imported normally)
import { AgencyDashboard } from "@/modules/core/dashboard/components/agency-dashboard"
import { CleaningDashboard } from "@/modules/core/dashboard/components/cleaning-dashboard"
import { ResellerDashboard } from "@/modules/core/dashboard/components/reseller-dashboard"
import { RestoDashboard } from "@/modules/core/dashboard/components/resto-dashboard"
import { RetailDashboard } from "@/modules/core/dashboard/components/retail-dashboard"
import { RealEstateDashboard } from "@/modules/core/dashboard/components/real-estate-dashboard"
import { DefaultDashboard } from "@/modules/core/dashboard/components/default-dashboard"

export default async function DashboardPage() {
    const payload = await getDashboardPayload()

    if (!payload) {
        return <DashboardSkeleton />
    }

    const { orgType, dashboardData, extraData, userRole } = payload

    return (
        <div className="flex flex-col w-full h-full">
            {/* 
              Motor de Enrutamiento Pluggable de Carga Ligera (Lado del Servidor): 
              Solo el dashboard correspondiente al orgType del tenant será hidratado en el cliente.
            */}
            <Suspense fallback={<DashboardSkeleton />}>
                {orgType === 'agency' && <AgencyDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} />}
                {orgType === 'cleaning' && <CleaningDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} />}
                {orgType === 'reseller' && <ResellerDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} />}
                {orgType === 'resto' && <RestoDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} />}
                {orgType === 'retail' && <RetailDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} />}
                {orgType === 'real_estate' && <RealEstateDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} />}
                {orgType === 'saas' && <DefaultDashboard dashboardData={dashboardData} extraData={extraData} userRole={userRole} />}

                {/* Fallback de Seguridad */}
                {!['agency', 'cleaning', 'reseller', 'resto', 'retail', 'saas', 'real_estate'].includes(orgType) && (
                    <AgencyDashboard dashboardData={dashboardData} extraData={extraData} />
                )}
            </Suspense>
        </div>
    )
}
