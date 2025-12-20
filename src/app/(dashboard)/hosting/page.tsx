"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, CreditCard, Server, Megaphone, Monitor, Box, Eye, Trash2, Loader2, RefreshCw, Zap, CalendarClock } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { AddServiceModal } from "@/components/modules/services/add-service-modal"
import { cn } from "@/lib/utils"

interface ServiceFromDB {
    id: string
    name: string
    description?: string
    type: 'recurring' | 'one_off'
    frequency?: string
    amount: number
    status: string
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

    // Reuse pill component logic
    const FilterPill = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
        <button
            onClick={onClick}
            className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                active
                    ? "bg-black text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
        >
            {label}
        </button>
    )

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

            {/* Filters Area */}
            <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por servicio o cliente..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                    {/* Status Filters */}
                    <div className="space-y-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Estado</span>
                        <div className="flex flex-wrap gap-2">
                            <FilterPill label="Todos" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
                            <FilterPill label="Activos" active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} />
                            <FilterPill label="Pausados" active={statusFilter === 'paused'} onClick={() => setStatusFilter('paused')} />
                        </div>
                    </div>

                    {/* Type Filters */}
                    <div className="space-y-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Tipo</span>
                        <div className="flex flex-wrap gap-2">
                            <FilterPill label="Todos" active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
                            <FilterPill label="Recurrentes" active={typeFilter === 'recurring'} onClick={() => setTypeFilter('recurring')} />
                            <FilterPill label="Proyectos" active={typeFilter === 'one_off'} onClick={() => setTypeFilter('one_off')} />
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
                                <TableRow key={service.id} className="group">
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
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <AddServiceModal
                                                serviceToEdit={service}
                                                clientId={service.client?.id}
                                                onSuccess={fetchServices}
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                }
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteService(service.id)}
                                                className="h-8 w-8 text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
