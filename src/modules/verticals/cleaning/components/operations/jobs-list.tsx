"use client"

import { useEffect, useState } from "react"
import { getCleaningJobs, CleaningJob } from "@/modules/verticals/cleaning/actions/job-actions"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, MapPin, User, Clock, MoreHorizontal, Play, CheckCircle, FileText, XCircle, Loader2, Filter, Search } from "lucide-react"
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
import { updateJobStatus, generateInvoiceFromJob } from "@/modules/verticals/cleaning/actions/operation-actions"
import { useRouter } from "next/navigation"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"

interface JobsListProps {
    viewMode?: 'list' | 'grid'
}

export function JobsList({ viewMode = 'list' }: JobsListProps) {
    const [jobs, setJobs] = useState<CleaningJob[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [isMounted, setIsMounted] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")
    const router = useRouter()

    useEffect(() => {
        setIsMounted(true)
        loadJobs()
    }, [])

    async function loadJobs() {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const data = await getCleaningJobs(today.toISOString())
            setJobs(data)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleStatusChange(jobId: string, status: any) {
        setProcessingId(jobId)
        const res = await updateJobStatus(jobId, status)
        if (res.success) {
            // Optimistic update or reload
            loadJobs()
        } else {
            console.error(res.error)
            alert("Error al actualizar estado")
        }
        setProcessingId(null)
    }

    async function handleInvoice(jobId: string) {
        setProcessingId(jobId)
        const res = await generateInvoiceFromJob(jobId)
        if (res.success && res.invoiceId) {
            router.push(`/invoices/${res.invoiceId}`)
        } else {
            console.error(res.error)
            alert("Error al generar factura")
        }
        setProcessingId(null)
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'pending': return 'secondary'
            case 'assigned': return 'default' // Blueish
            case 'in_progress': return 'destructive' // Orange/Red (Busy)
            case 'completed': return 'success' // Green usually, but outline for done is okay - using success if available or default
            default: return 'outline'
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando trabajos...</div>
    }

    if (!isMounted) {
        return <div className="p-8 text-center text-muted-foreground">Cargando...</div>
    }

    // ... inside component
    if (jobs.length === 0) {
        return (
            <EmptyState
                title="No hay trabajos agendados hoy"
                description="Parece que no tienes operaciones programadas para este día."
                icon={Calendar}
            />
        )
    }

    // Filter jobs by status and search query
    const filteredJobs = jobs.filter(job => {
        // Status Filter
        if (statusFilter !== "all" && job.status !== statusFilter) return false

        // Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return (
                job.title.toLowerCase().includes(query) ||
                job.client?.name?.toLowerCase().includes(query) ||
                job.location_address?.toLowerCase().includes(query)
            )
        }

        return true
    })

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
                            <SelectItem value="assigned">Asignados</SelectItem>
                            <SelectItem value="in_progress">En Curso</SelectItem>
                            <SelectItem value="completed">Completados</SelectItem>
                            <SelectItem value="cancelled">Cancelados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground ml-auto hidden sm:block">
                    {filteredJobs.length} resultados
                </div>
            </div>

            {/* Jobs List or Grid */}
            {viewMode === 'grid' ? (
                /* Grid View - Compact Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredJobs.map((job) => (
                        <Card key={job.id} className="hover:shadow-md transition-shadow overflow-hidden">
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-base truncate">{job.title}</h4>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            {format(new Date(job.start_time), "d MMM, h:mm a", { locale: es })}
                                        </div>
                                    </div>
                                    <Badge variant={getStatusVariant(job.status) as any} className="ml-2">
                                        {job.status === 'in_progress' ? 'En Curso' :
                                            job.status === 'pending' ? 'Pendiente' :
                                                job.status === 'assigned' ? 'Asignado' :
                                                    job.status === 'completed' ? 'Completado' :
                                                        job.status === 'cancelled' ? 'Cancelado' : job.status}
                                    </Badge>
                                </div>

                                <div className="space-y-2 text-sm mb-3">
                                    {job.client && (
                                        <div className="flex items-center text-muted-foreground">
                                            <User className="w-3.5 h-3.5 mr-2" />
                                            <span className="truncate">{job.client.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center text-muted-foreground">
                                        <MapPin className="w-3.5 h-3.5 mr-2" />
                                        <span className="truncate">{job.location_address || "Sin dirección"}</span>
                                    </div>
                                </div>

                                {job.staff && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                                            {(job.staff.first_name || 'S').substring(0, 2).toUpperCase()}
                                        </div>
                                        <span>{job.staff.first_name} {job.staff.last_name}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                /* List View - Table Format */
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Trabajo</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha/Hora</TableHead>
                                <TableHead>Personal</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="w-[100px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredJobs.map((job) => (
                                <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50">
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{job.title}</div>
                                            <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                                                <MapPin className="w-3 h-3 mr-1" />
                                                {job.location_address || "Sin dirección"}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {job.client ? (
                                            <span className="font-medium">{job.client.name}</span>
                                        ) : (
                                            <span className="text-muted-foreground italic">Sin cliente</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div>{format(new Date(job.start_time), "d MMM yyyy", { locale: es })}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {format(new Date(job.start_time), "h:mm a", { locale: es })} - {format(new Date(job.end_time), "h:mm a", { locale: es })}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {job.staff ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                                                    {(job.staff.first_name || 'S').substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-sm">{job.staff.first_name} {job.staff.last_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Sin asignar</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(job.status) as any}>
                                            {job.status === 'in_progress' ? 'En Curso' :
                                                job.status === 'pending' ? 'Pendiente' :
                                                    job.status === 'assigned' ? 'Asignado' :
                                                        job.status === 'completed' ? 'Completado' :
                                                            job.status === 'cancelled' ? 'Cancelado' : job.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild disabled={!!processingId}>
                                                <Button variant="ghost" size="sm">
                                                    {processingId === job.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {job.status === 'assigned' && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(job.id, 'in_progress')}>
                                                        <Play className="mr-2 h-4 w-4" />
                                                        Iniciar Trabajo
                                                    </DropdownMenuItem>
                                                )}
                                                {job.status === 'in_progress' && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(job.id, 'completed')}>
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Marcar Completado
                                                    </DropdownMenuItem>
                                                )}
                                                {job.status === 'completed' && (
                                                    <DropdownMenuItem onClick={() => handleInvoice(job.id)}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        Generar Factura
                                                    </DropdownMenuItem>
                                                )}
                                                {(job.status === 'pending' || job.status === 'assigned') && (
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleStatusChange(job.id, 'cancelled')}>
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

function getStatusVariant(status: string) {
    switch (status) {
        case 'completed': return 'default'
        case 'in_progress': return 'default'
        case 'assigned': return 'secondary'
        case 'pending': return 'outline'
        case 'cancelled': return 'destructive'
        default: return 'outline'
    }
}
