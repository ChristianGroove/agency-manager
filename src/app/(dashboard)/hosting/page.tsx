"use client"

/**
 * NOMENCLATURA: Este módulo muestra "Contratos" en la UI.
 * Backend usa tabla 'services' (NO cambiar nombres técnicos).
 * "Contratos" = Servicios YA vendidos/contratados a clientes.
 * Ver: /NOMENCLATURE.md para más info.
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, CreditCard, Server, Megaphone, Monitor, Box, Eye, Trash2, Loader2, RefreshCw, Zap, CalendarClock, MoreHorizontal, Pencil, FileText, PlayCircle, PauseCircle, ListFilter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { BulkActionsFloatingBar } from "@/components/shared/bulk-actions-floating-bar"
import { toast } from "sonner"
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
import { CreateServiceSheet } from "@/modules/core/billing/components/create-service-sheet"
import { ServiceDetailModal } from "@/modules/core/billing/components/service-detail-modal"
import { ResumeServiceModal } from "@/modules/core/billing/components/resume-service-modal"
import { toggleServiceStatus } from "@/modules/core/billing/services-actions"
import { cn } from "@/lib/utils"
import { SplitText } from "@/components/ui/split-text"

import { Service } from "@/types"

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)

    // Modern Filters
    const [showFilters, setShowFilters] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>("active") // Default to active
    const [typeFilter, setTypeFilter] = useState<string>("all")

    // Details Modal State
    const [selectedServiceForDetails, setSelectedServiceForDetails] = useState<Service | null>(null)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

    // Resume Modal State
    const [selectedServiceForResume, setSelectedServiceForResume] = useState<Service | null>(null)
    const [isResumeModalOpen, setIsResumeModalOpen] = useState(false)

    const handlePauseService = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas pausar este contrato? Se detendrá la facturación hasta que lo reanudes.")) return

        try {
            const result = await toggleServiceStatus(id, 'paused')
            if (result.success) {
                await fetchServices()
            } else {
                alert("Error al pausar el contrato")
            }
        } catch (error) {
            console.error(error)
            alert("Error desconocido")
        }
    }

    const fetchServices = async () => {
        setLoading(true)
        try {
            const { getServices } = await import("@/modules/core/billing/services-actions")
            const data = await getServices()
            if (data) setServices(data as unknown as Service[])
        } catch (error) {
            console.error("Error fetching services:", error)
        } finally {
            setLoading(false)
        }
    }

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds)
        if (newSelection.has(id)) {
            newSelection.delete(id)
        } else {
            newSelection.add(id)
        }
        setSelectedIds(newSelection)
    }

    const toggleAll = () => {
        if (selectedIds.size === filteredServices.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredServices.map(s => s.id)))
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`¿Estás seguro de eliminar ${selectedIds.size} contratos seleccionados?`)) return

        setIsDeleting(true)
        try {
            const { deleteServices } = await import("@/modules/core/billing/services-actions")
            await deleteServices(Array.from(selectedIds))
            toast.success(`${selectedIds.size} contratos eliminados correctamente`)
            setSelectedIds(new Set())
            await fetchServices()
        } catch (error) {
            console.error("Error deleting services:", error)
            toast.error("Error al eliminar los contratos seleccionados")
        } finally {
            setIsDeleting(false)
        }
    }

    useEffect(() => {
        fetchServices()
    }, [])

    const handleDeleteService = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este contrato? Esta acción hará lo siguiente:\n\n1. Archivará el contrato.\n2. CANCELARÁ sus facturas pendientes/vencidas.\n\nEl historial de pagos se mantendrá intacto.")) return

        try {
            // 1. Check for Pending/Overdue Invoices
            const { data: invoicesToCancel, error: fetchError } = await supabase
                .from('invoices')
                .select('id, status')
                .eq('service_id', id)
                .in('status', ['pending', 'overdue'])

            if (fetchError) console.error("Error checking invoices:", fetchError)

            const count = invoicesToCancel?.length || 0
            console.log(`Found ${count} invoices to cancel for service ${id}`)

            if (count > 0) {
                // 2. Cancel them explicitly
                const { error: invoiceError } = await supabase
                    .from('invoices')
                    .update({ status: 'cancelled' })
                    .eq('service_id', id)
                    .in('status', ['pending', 'overdue'])

                if (invoiceError) {
                    console.error("Error cancelling invoices:", invoiceError)
                    toast.error("Error al cancelar facturas. Revisa la consola.")
                    // Don't block deletion, but warn
                } else {
                    console.log("Invoices cancelled successfully.")
                }
            }

            // 3. Soft Delete the Service
            const { error } = await supabase
                .from('services')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error

            toast.success(`Contrato eliminado. ${count > 0 ? `Se cancelaron ${count} facturas pendientes.` : ''}`)
            await fetchServices()

            // 4. Force global validation (optional hook)
        } catch (error) {
            console.error("Error deleting service:", error)
            toast.error("No se pudo completar la operación.")
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
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        <SplitText>Contratos</SplitText>
                    </h2>
                    <p className="text-muted-foreground mt-1">Servicios contratados y proyectos en curso de tus clientes.</p>
                </div>
                <div className="w-full md:w-auto">
                    <CreateServiceSheet
                        onSuccess={fetchServices}
                        trigger={
                            <Button className="w-full md:w-auto bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Contrato
                            </Button>
                        }
                    />
                </div>
            </div>

            {/* Unified Control Block */}
            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-1.5 flex flex-col md:flex-row items-center gap-2 flex-1 transition-all hover:shadow-md">
                    {/* Integrated Search */}
                    <div className="relative flex-1 w-full md:w-auto min-w-[200px] flex items-center px-3 gap-2">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <Input
                            placeholder="Buscar por contrato o cliente..."
                            className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full outline-none text-gray-700 dark:text-white placeholder:text-gray-400 h-9 p-0 shadow-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Collapsible Filter Groups (Middle) */}
                    <div className={cn(
                        "flex items-center gap-4 overflow-hidden transition-all duration-300 ease-in-out",
                        showFilters ? "max-w-[800px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0 p-0 pointer-events-none"
                    )}>
                        <div className="flex items-center gap-4 min-w-max">
                            <div className="h-4 w-px bg-gray-300 mx-1 hidden md:block" />

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
                                                ? filter.id === 'active' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-500/20 shadow-sm"
                                                    : filter.id === 'paused' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-500/20 shadow-sm"
                                                        : "bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
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
                                                ? filter.id === 'recurring' ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-600/20 dark:ring-indigo-500/20 shadow-sm"
                                                    : filter.id === 'one_off' ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-1 ring-inset ring-violet-600/20 dark:ring-violet-500/20 shadow-sm"
                                                        : "bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
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

                    {/* Divider */}
                    <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />

                    {/* Toggle Filters Button (Fixed Right) */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
                            showFilters
                                ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border-gray-200 dark:border-white/10 shadow-inner"
                                : "bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                        )}
                        title="Filtrar Contratos"
                    >
                        <ListFilter className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md shadow-sm overflow-hidden relative">
                <BulkActionsFloatingBar
                    selectedCount={selectedIds.size}
                    onDelete={handleBulkDelete}
                    onClearSelection={() => setSelectedIds(new Set())}
                    isDeleting={isDeleting}
                />
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 dark:bg-white/5 dark:hover:bg-white/5 border-gray-100 dark:border-white/10">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={filteredServices.length > 0 && selectedIds.size === filteredServices.length}
                                    onCheckedChange={toggleAll}
                                />
                            </TableHead>
                            <TableHead >Contrato / Cliente</TableHead>
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
                                <TableCell colSpan={7} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Cargando contratos...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredServices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    No se encontraron contratos con estos filtros.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredServices.map((service) => (
                                <TableRow key={service.id} className="group hover:bg-gray-50/30 dark:hover:bg-white/5 transition-colors border-gray-100 dark:border-white/10">
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(service.id)}
                                            onCheckedChange={() => toggleSelection(service.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                                            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="truncate max-w-[200px]">{service.client?.name || 'Sin Cliente'}</span>
                                                {service.client?.company_name && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                                                        {service.client.company_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {service.type === 'recurring' ? (
                                            <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20">
                                                <RefreshCw className="h-3 w-3 mr-1" /> Recurrente
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20">
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
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            ${service.amount?.toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={cn(
                                            "capitalize",
                                            service.status === 'active' ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100" :
                                                service.status === 'paused' ? "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100" :
                                                    "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-400 hover:bg-gray-100"
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
                                                <CreateServiceSheet
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

                                                <DropdownMenuSeparator />

                                                {service.status === 'active' ? (
                                                    <DropdownMenuItem
                                                        onClick={() => handlePauseService(service.id)}
                                                        className="text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                                                    >
                                                        <PauseCircle className="mr-2 h-4 w-4" />
                                                        Pausar Contrato
                                                    </DropdownMenuItem>
                                                ) : service.status === 'paused' ? (
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedServiceForResume(service)
                                                            setIsResumeModalOpen(true)
                                                        }}
                                                        className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                                                    >
                                                        <PlayCircle className="mr-2 h-4 w-4" />
                                                        Reanudar Contrato
                                                    </DropdownMenuItem>
                                                ) : null}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ServiceDetailModal
                service={selectedServiceForDetails}
                isOpen={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
            />

            <ResumeServiceModal
                service={selectedServiceForResume}
                isOpen={isResumeModalOpen}
                onClose={() => setIsResumeModalOpen(false)}
                onSuccess={fetchServices}
            />
        </div>
    )
}
