"use client"

import { SaasApp } from "./app-management-actions"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Package, CheckCircle2, XCircle } from "lucide-react"

interface AppListProps {
    items: SaasApp[]
    onEdit?: (item: SaasApp) => void
    onDelete?: (id: string) => void
}

export function AppList({ items, onEdit, onDelete }: AppListProps) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl border-gray-200 bg-gray-50/50">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No hay aplicaciones</h3>
                <p className="text-sm text-gray-500 max-w-sm mt-1">
                    Comienza creando tu primera aplicación SaaS.
                </p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((app) => (
                <Card key={app.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                                <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-900">{app.name}</CardTitle>
                                <CardDescription className="text-xs font-mono text-gray-500 mt-1">
                                    {app.slug}
                                </CardDescription>
                            </div>
                        </div>
                        <Badge variant={app.is_active ? "default" : "secondary"} className={app.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                            {app.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                    </CardHeader>
                    <CardContent className="flex-1 pt-4">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 line-clamp-3">
                                {app.description}
                            </p>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Precio Mensual</span>
                                <span className="font-semibold text-gray-900">
                                    ${app.price_monthly.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Categoría</span>
                                <Badge variant="outline" className="capitalize">
                                    {app.category}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-4 border-t gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit?.(app)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </Button>
                        {/* Delete logic can be added later if needed */}
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
