import { Suspense } from "react"
import { PipelineStagesManager } from "@/modules/features/crm/components/pipeline-stages-manager"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { redirect } from "next/navigation"

export const metadata = {
    title: "Configuración de Pipeline | CRM",
    description: "Gestiona las etapas de tu pipeline de ventas",
}

export default async function PipelineSettingsPage() {
    if (!await hasPermission(PERMISSIONS.CRM.MANAGE_SETTINGS)) {
        redirect("/dashboard?error=unauthorized")
    }

    return (
        <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
            <PipelineStagesManager />
        </Suspense>
    )
}
