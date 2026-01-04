import { Suspense } from "react"
import { CRMDashboard } from "@/modules/core/crm/components/crm-dashboard"

export const metadata = {
    title: "Pipeline | CRM",
    description: "Gestión de prospectos y pipeline de ventas",
}

export default function CRMPipelinePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando Pipeline...</div>}>
            <CRMDashboard />
        </Suspense>
    )
}
