import { Suspense } from "react"
import { CRMDashboard } from "@/modules/core/crm/components/crm-dashboard"

export const metadata = {
    title: "CRM | Leads",
    description: "Gestión de prospectos y pipeline de ventas",
}

export default function CRMPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando CRM...</div>}>
            <CRMDashboard />
        </Suspense>
    )
}
