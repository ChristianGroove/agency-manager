"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, CreditCard, Server, Megaphone, Monitor, Box, Eye, Trash2, Loader2, RefreshCw, Zap, CalendarClock, MoreHorizontal, Pencil, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { AddServiceModal } from "@/components/modules/services/add-service-modal"
import { ServiceDetailsModal } from "@/components/modules/services/service-details-modal"
import { cn } from "@/lib/utils"

interface ServiceFromDB {
    id: string
    name: string
    description?: string
    type: 'recurring' | 'one_off'
    frequency?: string
    amount: number
    status: string
    created_at?: string
    client: {
        id: string
        name: string
        company_name: string
    }
    // Optional: Include invoice info if needed, but keeping it simple for now
}

export default function ServicesPage() {
    const [services, setServices] = useState<ServiceFromDB[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Modern Filters
    const [statusFilter, setStatusFilter] = useState<string>("active") // Default to active
    const [typeFilter, setTypeFilter] = useState<string>("all")

    // Details Modal State
    const [selectedServiceForDetails, setSelectedServiceForDetails] = useState<ServiceFromDB | null>(null)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

    const fetchServices = async () => {
        setLoading(true)
        // Fetch from 'services' table instead of 'subscriptions'
        const { data, error } = await supabase
            .from('services')
            .select(`
                *,
                client:clients(id, name, company_name)
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Error fetching services:", error)
        } else if (data) {
            setServices(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchServices()
    }, [])

    const handleDeleteService = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer.")) return

        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id)

            if (error) throw error
            await fetchServices()
        } catch (error) {
            console.error("Error deleting service:", error)
            alert("Error al eliminar el servicio")
        }
    }

    const filteredServices = services.filter(service => {
        const matchesSearch =
            service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.client?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || service.status === statusFilter
        const matchesType = typeFilter === "all" || service.type === typeFilter

        // Handle "active" filter specifically to include only active services vs others
        // (If simple match is enough, keep it simple. But usually 'active' means status='active')

        return matchesSearch && matchesStatus && matchesType
    })

    const getFrequencyLabel = (freq?: string) => {
        if (!freq) return '-'
        const map: Record<string, string> = {
            monthly: 'Mensual',
            biweekly: 'Quincenal',
            quarterly: 'Trimestral',
            semiannual: 'Semestral',
            yearly: 'Anual'
        }
        return map[freq] || freq
    }

    const counts = {
        all: services.length,
        status: {
            all: services.length,
            active: services.filter(s => s.status === 'active').length,
            paused: services.filter(s => s.status === 'paused').length,
        },
        type: {
            all: services.length,
            recurring: services.filter(s => s.type === 'recurring').length,
            one_off: services.filter(s => s.type === 'one_off').length,
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Servicios</h2>
                    <p className="text-muted-foreground mt-1">Suscripciones y proyectos únicos de tus clientes</p>
                </div>
                <div className="w-full md:w-auto">
                    <AddServiceModal
                        onSuccess={fetchServices}
                        trigger={
                            <Button className="w-full md:w-auto bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Servicio
                            </Button>
                        }
                    />
                </div>
            </div>

            {/* Unified Control Block */}
            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex flex-col md:flex-row items-center gap-2 flex-1 transition-all hover:shadow-md">
                    {/* Integrated Search */}
                    <div className="relative flex-1 w-full md:w-auto min-w-[200px] flex items-center px-3 gap-2">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <Input
                            placeholder="Buscar por servicio o cliente..."
                            className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full outline-none text-gray-700 placeholder:text-gray-400 h-9 p-0 shadow-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Vertical Divider (Desktop) */}
                    <div className="h-6 w-px bg-gray-200 hidden md:block" />

                    {/* Filter Groups Container */}
                    <div className="flex items-center gap-4 overflow-x-auto w-full md:w-auto scrollbar-hide p-1 md:p-0">

                        {/* Status Filters */}
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden lg:block">Estado</span>
                            {[
                                { id: 'all', label: 'Todos', count: counts.status.all, color: 'gray' },
                                { id: 'active', label: 'Activos', count: counts.status.active, color: 'emerald' },
                                { id: 'paused', label: 'Pausados', count: counts.status.paused, color: 'amber' },
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                        statusFilter === filter.id
                                            ? filter.id === 'active' ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 shadow-sm"
                                                : filter.id === 'paused' ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 shadow-sm"
                                                    : "bg-gray-900 text-white shadow-sm"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <span>{filter.label}</span>
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-md text-[10px]",
                                        statusFilter === filter.id
                                            ? "bg-white/20 text-current"
                                            : "bg-gray-100 text-gray-500"
                                    )}>
                                        {filter.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="h-4 w-px bg-gray-200 hidden sm:block" />

                        {/* Type Filters */}
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden lg:block">Tipo</span>
                            {[
                                { id: 'all', label: 'Todos', count: counts.type.all },
                                { id: 'recurring', label: 'Recurrentes', count: counts.type.recurring },
                                { id: 'one_off', label: 'Proyectos', count: counts.type.one_off },
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setTypeFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                        typeFilter === filter.id
                                            ? filter.id === 'recurring' ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 shadow-sm"
                                                : filter.id === 'one_off' ? "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20 shadow-sm"
                                                    : "bg-gray-900 text-white shadow-sm"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <span>{filter.label}</span>
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-md text-[10px]",
                                        typeFilter === filter.id
                                            ? "bg-white/20 text-current"
                                            : "bg-gray-100 text-gray-500"
                                    )}>
                                        {filter.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead >Servicio / Cliente</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Frecuencia</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Cargando servicios...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredServices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No se encontraron servicios con estos filtros.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredServices.map((service) => (
                                <TableRow key={service.id} className="group hover:bg-gray-50/30 transition-colors">
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-gray-900">{service.name}</p>
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <span className="truncate max-w-[200px]">{service.client?.name || 'Sin Cliente'}</span>
                                                {service.client?.company_name && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">
                                                        {service.client.company_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {service.type === 'recurring' ? (
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                <RefreshCw className="h-3 w-3 mr-1" /> Recurrente
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                <Zap className="h-3 w-3 mr-1" /> Proyecto
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {service.type === 'recurring' ? (
                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <CalendarClock className="h-4 w-4 text-gray-400" />
                                                {getFrequencyLabel(service.frequency)}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">
                                            ${service.amount?.toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={cn(
                                            "capitalize",
                                            service.status === 'active' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" :
                                                service.status === 'paused' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" :
                                                    "bg-gray-100 text-gray-700 hover:bg-gray-100"
                                        )}>
                                            {service.status === 'active' ? 'Activo' :
                                                service.status === 'paused' ? 'Pausado' : 'Cancelado'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setSelectedServiceForDetails(service)
                                                        setIsDetailsModalOpen(true)
                                                    }}
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Ver Detalle
                                                </DropdownMenuItem>

                                                {/* Edit triggers modal via standard open/close pattern */}
                                                <AddServiceModal
                                                    serviceToEdit={service}
                                                    clientId={service.client?.id}
                                                    onSuccess={fetchServices}
                                                    trigger={
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                    }
                                                />

                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteService(service.id)}
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ServiceDetailsModal
                service={selectedServiceForDetails}
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
            />
        </div>
    )
}
