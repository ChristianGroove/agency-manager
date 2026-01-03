"use client"

import { useEffect, useState } from "react"
import { getWorkOrders, updateWorkOrder } from "../../actions/work-order-actions"
import { WorkOrder } from "@/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MapPin, User, Clock, MoreHorizontal, Play, CheckCircle, FileText, XCircle, Loader2, Filter, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface WorkOrdersListProps {
    viewMode?: 'list' | 'grid'
}

export function WorkOrdersList({ viewMode = 'list' }: WorkOrdersListProps) {
    const [orders, setOrders] = useState<WorkOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        loadOrders()
    }, [])

    async function loadOrders() {
        try {
            // Fetch all for now, or filter by date range if needed
            const data = await getWorkOrders()
            setOrders(data)
        } catch (error) {
            console.error(error)
            toast.error("Error loading work orders")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleStatusChange(id: string, status: any) {
        setProcessingId(id)
        const res = await updateWorkOrder(id, { status })
        if (res.success) {
            toast.success("Estado actualizado")
            loadOrders()
        } else {
            console.error(res.error)
            toast.error("Error al actualizar estado")
        }
        setProcessingId(null)
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'pending': return 'secondary'
            case 'scheduled': return 'outline'
            case 'in_progress': return 'destructive' // Busy
            case 'completed': return 'default' // Green/Done
            default: return 'outline'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendiente'
            case 'scheduled': return 'Programado'
            case 'in_progress': return 'En Curso'
            case 'completed': return 'Completado'
            case 'cancelled': return 'Cancelado'
            case 'blocked': return 'Bloqueado'
            default: return status
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando órdenes de trabajo...</div>
    }

    // Filter
    const filteredOrders = orders.filter(order => {
        if (statusFilter !== "all" && order.status !== statusFilter) return false
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return (
                order.title.toLowerCase().includes(query) ||
                order.client?.name.toLowerCase().includes(query) ||
                order.location_address?.toLowerCase().includes(query)
            )
        }
        return true
    })

    if (orders.length === 0) {
        return (
            <EmptyState
                title="No hay trabajos registrados"
                description="Crea una nueva orden de trabajo para comenzar."
                icon={FileText}
            />
        )
    }

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-muted/30 p-3 rounded-lg">
                <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por cliente, título..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 bg-white"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-white">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="scheduled">Programados</SelectItem>
                            <SelectItem value="in_progress">En Curso</SelectItem>
                            <SelectItem value="completed">Completados</SelectItem>
                            <SelectItem value="cancelled">Cancelados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground ml-auto hidden sm:block">
                    {filteredOrders.length} resultados
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredOrders.map((order) => (
                        <Card key={order.id} className="hover:shadow-md transition-shadow overflow-hidden">
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-base truncate">{order.title}</h4>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            {order.start_time && format(new Date(order.start_time), "d MMM, h:mm a", { locale: es })}
                                        </div>
                                    </div>
                                    <Badge variant={getStatusVariant(order.status) as any} className="ml-2">
                                        {getStatusLabel(order.status)}
                                    </Badge>
                                </div>

                                <div className="space-y-2 text-sm mb-3">
                                    {order.client && (
                                        <div className="flex items-center text-muted-foreground">
                                            <User className="w-3.5 h-3.5 mr-2" />
                                            <span className="truncate">{order.client.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center text-muted-foreground">
                                        <MapPin className="w-3.5 h-3.5 mr-2" />
                                        <span className="truncate">{order.location_address || "Sin dirección"}</span>
                                    </div>
                                </div>

                                {order.assignee && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                                            {(order.assignee.first_name || 'S').substring(0, 2).toUpperCase()}
                                        </div>
                                        <span>{order.assignee.first_name} {order.assignee.last_name}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="border rounded-lg bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Trabajo</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha/Hora</TableHead>
                                <TableHead>Asignado A</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="w-[80px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.map((order) => (
                                <TableRow key={order.id} className="hover:bg-muted/50">
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{order.title}</div>
                                            <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                                                <MapPin className="w-3 h-3 mr-1" />
                                                {order.location_address || "Sin dirección"}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {order.client ? (
                                            <span className="font-medium">{order.client.name}</span>
                                        ) : (
                                            <span className="text-muted-foreground italic">Sin cliente</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {order.start_time && (
                                                <>
                                                    <div>{format(new Date(order.start_time), "d MMM yyyy", { locale: es })}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(order.start_time), "h:mm a", { locale: es })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {order.assignee ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                                                    {(order.assignee.first_name || 'S').substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-sm">{order.assignee.first_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Sin asignar</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(order.status) as any}>
                                            {getStatusLabel(order.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild disabled={!!processingId}>
                                                <Button variant="ghost" size="sm">
                                                    {processingId === order.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {(order.status === 'scheduled' || order.status === 'pending') && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'in_progress')}>
                                                        <Play className="mr-2 h-4 w-4" />
                                                        Iniciar
                                                    </DropdownMenuItem>
                                                )}
                                                {order.status === 'in_progress' && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'completed')}>
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Completar
                                                    </DropdownMenuItem>
                                                )}
                                                {order.status !== 'cancelled' && order.status !== 'completed' && (
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleStatusChange(order.id, 'cancelled')}>
                                                        <XCircle className="mr-2 h-4 w-4" />
                                                        Cancelar
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
