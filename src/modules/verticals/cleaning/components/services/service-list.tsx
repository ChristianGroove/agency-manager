"use client"

import { useEffect, useState } from "react"
import { getCleaningServices, deleteCleaningService } from "../../actions/service-actions"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Clock, DollarSign, MoreVertical } from "lucide-react"
import { ServiceForm } from "./service-form"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ServiceListProps {
    viewMode?: 'list' | 'grid'
}

export function ServiceList({ viewMode = 'grid' }: ServiceListProps) {
    const [services, setServices] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [serviceToEdit, setServiceToEdit] = useState<any>(null)

    const loadServices = async () => {
        setIsLoading(true)
        try {
            const data = await getCleaningServices()
            setServices(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar servicios")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadServices()
    }, [])

    const handleDelete = async (service: any) => {
        if (!confirm(`¿Eliminar "${service.name}"? Los trabajos asociados no se verán afectados.`)) return

        try {
            const result = await deleteCleaningService(service.id)
            if (result.success) {
                toast.success("Servicio eliminado")
                loadServices()
            } else {
                toast.error("Error al eliminar")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
        }
    }

    const handleEdit = (service: any) => {
        setServiceToEdit(service)
        setIsFormOpen(true)
    }

    const handleCreate = () => {
        setServiceToEdit(null)
        setIsFormOpen(true)
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">Catálogo de Servicios</h3>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (services.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">Catálogo de Servicios</h3>
                        <p className="text-sm text-gray-500">Gestiona los tipos de limpieza que ofreces.</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Servicio
                    </Button>
                </div>
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
                    <p className="text-gray-500">No hay servicios registrados.</p>
                    <Button variant="link" onClick={handleCreate}>Crear el primero</Button>
                </div>
                <ServiceForm
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    serviceToEdit={serviceToEdit}
                    onSuccess={loadServices}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Catálogo de Servicios</h3>
                    <p className="text-sm text-gray-500">{services.length} servicio{services.length !== 1 ? 's' : ''}</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Servicio
                </Button>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {services.map((service) => (
                        <Card key={service.id} className="hover:shadow-md transition-shadow overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-base truncate mb-1">{service.name}</h4>
                                        {service.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                                {service.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                                                <DollarSign className="h-3.5 w-3.5" />
                                                {service.base_price?.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5" />
                                                {service.estimated_duration}min
                                            </div>
                                        </div>
                                        {service.is_active !== undefined && !service.is_active && (
                                            <Badge variant="secondary" className="mt-2 text-[10px]">Inactivo</Badge>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                <MoreVertical className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(service)}>
                                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDelete(service)} className="text-red-600">
                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Servicio</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Precio Base</TableHead>
                                <TableHead>Duración</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="w-[100px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {services.map((service) => (
                                <TableRow key={service.id}>
                                    <TableCell className="font-medium">{service.name}</TableCell>
                                    <TableCell className="max-w-xs">
                                        <p className="text-sm text-muted-foreground truncate">
                                            {service.description || '-'}
                                        </p>
                                    </TableCell>
                                    <TableCell className="font-semibold text-green-600">
                                        ${service.base_price?.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm">
                                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                            {service.estimated_duration}min
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={service.is_active !== false ? "default" : "secondary"}>
                                            {service.is_active !== false ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(service)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(service)} className="text-red-600">
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <ServiceForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                serviceToEdit={serviceToEdit}
                onSuccess={loadServices}
            />
        </div>
    )
}
