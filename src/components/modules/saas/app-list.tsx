"use client"

import { SaaSProduct } from "@/types/saas"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Package } from "lucide-react"

interface AppListProps {
    items: SaaSProduct[]
    onEdit?: (item: SaaSProduct) => void
    onDelete?: (id: string) => void
}

export function AppList({ items, onEdit, onDelete }: AppListProps) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl border-gray-200 bg-gray-50/50">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No hay Apps creadas</h3>
                <p className="text-sm text-gray-500 max-w-sm mt-1">
                    Comienza creando tu primer producto SaaS para empaquetar tus módulos.
                </p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((app) => (
                <Card key={app.id} className="group hover:shadow-lg transition-all duration-300 border-gray-200/50 bg-white/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-lg bg-indigo-100/50 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                                <Package className="h-5 w-5" />
                            </div>
                            <Badge variant={app.status === 'published' ? 'default' : 'secondary'} className="capitalize">
                                {app.status === 'published' ? 'Publicado' : 'Borrador'}
                            </Badge>
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-900">{app.name}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                            {app.description || "Sin descripción"}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3">
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-2xl font-bold text-gray-900">
                                ${app.base_price.toLocaleString()}
                            </span>
                            <span className="text-sm text-gray-500 font-medium">
                                /{app.pricing_model === 'subscription' ? 'mes' : 'único'}
                            </span>
                        </div>

                        {app.modules && app.modules.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {app.modules.slice(0, 3).map((m, i) => (
                                    <Badge key={i} variant="outline" className="text-xs bg-white/50">
                                        {m.category === 'core' ? '🔹' : '🔸'} Module
                                    </Badge>
                                ))}
                                {app.modules.length > 3 && (
                                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">
                                        +{app.modules.length - 3} más
                                    </Badge>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">Sin módulos asignados</p>
                        )}
                    </CardContent>

                    <CardFooter className="pt-3 border-t bg-gray-50/30">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
                            onClick={() => onEdit?.(app)}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Gestionar App
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
