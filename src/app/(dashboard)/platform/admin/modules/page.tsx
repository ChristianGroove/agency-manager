
import { ModulesTable } from "@/modules/admin/components/modules-table"
import { SplitText } from "@/components/ui/split-text"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Gestión de Módulos",
    description: "Administración global de los módulos del sistema"
}

export default function ModulesPage() {
    return (
        <div className="space-y-8 p-6 md:p-8">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                    <SplitText>Catálogo de Módulos (Core)</SplitText>
                </h2>
                <p className="text-muted-foreground">
                    Gestiona los bloques fundamentales del sistema. Aquí puedes ver dependencias, versiones y estado de obsolescencia.
                </p>
            </div>

            <div className="flex flex-col gap-6">
                <ModulesTable />
            </div>
        </div>
    )
}
