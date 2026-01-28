
import { TemplateSelector } from "@/modules/core/crm/components/template-selector"
import { SectionHeader } from "@/components/layout/section-header"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Plantillas de Pipeline | CRM",
    description: "Configura tu proceso de ventas con plantillas predefinidas.",
}

export default function PipelineTemplatesPage() {
    return (
        <div className="space-y-6">
            <SectionHeader
                title="Plantillas de Industria"
                subtitle="Estas plantillas reconfiguran tu pipeline de ventas y estados del motor de procesos. Elige la que mejor se adapte a tu modelo de negocio."
                titleClassName="text-2xl"
            />

            <div className="mt-8">
                <TemplateSelector />
            </div>
        </div>
    )
}
