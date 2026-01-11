"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Server,
    MoreVertical,
    Edit,
    Trash2,
    CalendarClock,
    Layout,
    List,
    PauseCircle
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/status-badge"
import { useState } from "react"

interface ClientServicesListProps {
    services: any[]
    subscriptions: any[]
    onEdit: (service: any) => void
    onDelete: (id: string) => void
    onPause: (id: string) => void
    onDetail: (service: any) => void
}

export function ClientServicesList({
    services,
    subscriptions,
    onEdit,
    onDelete,
    onPause,
    onDetail
}: ClientServicesListProps) {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

    // Combine services and subscriptions if needed, or just allow parent to pass unified list
    // For now assuming 'services' contains everything or we map them.
    // The original code iterated `client.services`.

    const displayServices = services || []

    return (
        <div className="space-y-4">
            {/* Header Control */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Server className="h-5 w-5 text-indigo-600" />
                    Servicios Activos
                </h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className={cn("h-7 w-7 p-0 rounded-md", viewMode === 'list' && "bg-white shadow-sm text-indigo-600")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className={cn("h-7 w-7 p-0 rounded-md", viewMode === 'grid' && "bg-white shadow-sm text-indigo-600")}
                    >
                        <Layout className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {displayServices.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <div className="bg-white p-3 rounded-full w-fit mx-auto mb-3 border border-gray-100 shadow-sm">
                        <Server className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">No hay servicios activos</p>
                    <p className="text-xs text-gray-400">Crea uno nuevo para comenzar a facturar.</p>
                </div>
            ) : (
                <div className={cn("grid gap-3", viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                    {displayServices.map((service) => (
                        <div
                            key={service.id}
                            onClick={() => onDetail(service)}
                            className={cn(
                                "group bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-indigo-300 transition-all cursor-pointer shadow-sm hover:shadow-md",
                                viewMode === 'list' ? "flex items-center p-3 gap-4" : "p-4 flex flex-col gap-3"
                            )}
                        >
                            {/* Icon */}
                            <div className={cn(
                                "shrink-0 flex items-center justify-center rounded-lg",
                                viewMode === 'list' ? "h-10 w-10" : "h-10 w-10 mb-1",
                                service.status === 'active' ? "bg-emerald-50 text-emerald-600" :
                                    service.status === 'paused' ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
                            )}>
                                <Server className="h-5 w-5" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{service.name}</h3>
                                    <StatusBadge status={service.status} type="service" className="text-[10px] h-5 px-1.5" entity={service} />
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">${service.amount?.toLocaleString()}</span>
                                    <span className="capitalize">{service.frequency}</span>
                                    {service.next_billing_date && (
                                        <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                            <CalendarClock className="h-3 w-3" />
                                            <span>{new Date(service.next_billing_date).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className={cn("flex items-center", viewMode === 'grid' && "justify-end pt-2 border-t border-gray-50 mt-1")}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-indigo-600"
                                    onClick={(e) => { e.stopPropagation(); onEdit(service); }}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPause(service.id); }} className="text-amber-600">
                                            <PauseCircle className="h-4 w-4 mr-2" /> Pausar (Cancelar)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(service.id); }} className="text-red-600">
                                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
