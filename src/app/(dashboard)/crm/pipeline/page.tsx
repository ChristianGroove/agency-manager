import { Suspense } from "react"
import { CRMDashboard } from "@/modules/core/crm/components/crm-dashboard"
import { getPipelineData } from "@/modules/core/crm/pipeline-actions"

export const metadata = {
    title: "Pipeline | CRM",
    description: "Gestión de prospectos y pipeline de ventas",
}

export const dynamic = 'force-dynamic'

export default async function CRMPipelinePage(props: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}) {
    const params = await props.searchParams
    const channelId = params.channel || null

    const data = await getPipelineData(channelId)

    if (!data) {
        return <div className="p-8 text-center text-red-500">Error: No se pudo cargar el contexto de organización.</div>
    }

    return (
        <Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Cargando Pipeline...</div>}>
            <div className="h-full flex flex-col">
                <CRMDashboard
                    initialLeads={data.leads}
                    initialStages={data.stages}
                    initialEmitters={data.emitters}
                    initialCount={data.totalCount}
                />
            </div>
        </Suspense>
    )
}
