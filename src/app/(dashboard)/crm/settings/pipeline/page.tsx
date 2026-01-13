import { Suspense } from "react"
import { PipelineStagesManager } from "@/modules/core/crm/components/pipeline-stages-manager"

export const metadata = {
    title: "Configuración de Pipeline | CRM",
    description: "Gestiona las etapas de tu pipeline de ventas",
}

export default function PipelineSettingsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
            <PipelineStagesManager />
        </Suspense>
    )
}
