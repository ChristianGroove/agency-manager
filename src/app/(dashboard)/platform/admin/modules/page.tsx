import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"

export default function ModulesPage() {
    // This would typically fetch from system_modules table
    const modules = [
        { name: "module_invoicing", label: "Facturación", enabled: true },
        { name: "module_payments", label: "Pagos", enabled: true },
        { name: "module_communications", label: "Comunicaciones", enabled: true },
        { name: "module_whitelabel", label: "Marca Blanca", enabled: true },
        { name: "core_crm", label: "CRM Core", enabled: true },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Módulos del Sistema</h1>
                <p className="text-muted-foreground">Vista general de los módulos disponibles en la plataforma.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {modules.map((module) => (
                    <Card key={module.name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {module.label}
                            </CardTitle>
                            {module.enabled ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground font-mono mt-2">
                                {module.name}
                            </div>
                            <Badge variant={module.enabled ? "default" : "secondary"} className="mt-4">
                                {module.enabled ? "Activo Globalmente" : "Inactivo"}
                            </Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
