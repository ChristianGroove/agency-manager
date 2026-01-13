
import { TemplateSelector } from "@/modules/core/crm/components/template-selector"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Plantillas de Pipeline | CRM",
    description: "Configura tu proceso de ventas con plantillas predefinidas.",
}

export default function PipelineTemplatesPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold tracking-tight">Plantillas de Industria</h3>
                <p className="text-muted-foreground">
                    Estas plantillas reconfiguran tu pipeline de ventas y estados del motor de procesos.
                    Elige la que mejor se adapte a tu modelo de negocio.
                </p>
            </div>

            <div className="mt-8">
                <TemplateSelector />
            </div>
        </div>
    )
}
