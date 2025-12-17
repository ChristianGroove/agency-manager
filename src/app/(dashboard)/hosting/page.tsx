"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, CreditCard, Server, Megaphone, Monitor, Box, Eye, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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

interface Service {
    id: string
    name: string
    service_type: string
    frequency: string
    amount: number
    next_billing_date: string | null
    status: string
    client: {
        name: string
        company_name: string
    }
    invoice?: {
        id: string
        status: string
        number: string
    }
}

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchServices = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('subscriptions')
            .select(`
                *,
                client:clients(name, company_name),
                invoice:invoices(id, status, number)
            `)
            .order('next_billing_date', { ascending: true })

        if (data) setServices(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchServices()
    }, [])

    const handleDeleteService = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer.")) return

        setDeletingId(id)
        try {
            const { error } = await supabase
                .from('subscriptions')
                .delete()
                .eq('id', id)

            if (error) throw error
            await fetchServices()
        } catch (error) {
            console.error("Error deleting service:", error)
            alert("Error al eliminar el servicio")
        } finally {
            setDeletingId(null)
        }
    }

    const filteredServices = services.filter(service => {
        const matchesSearch =
            service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.client?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesType = typeFilter === "all" || service.service_type === typeFilter

        return matchesSearch && matchesType
    })

    const getServiceIcon = (type: string) => {
        switch (type) {
            case 'hosting': return <Server className="h-4 w-4" />
            case 'marketing': return <Megaphone className="h-4 w-4" />
            case 'ads': return <Monitor className="h-4 w-4" />
            case 'crm': return <Box className="h-4 w-4" />
            default: return <CreditCard className="h-4 w-4" />
        }
    }

    const getServiceLabel = (type: string) => {
        switch (type) {
            case 'hosting': return 'Hosting'
            case 'marketing': return 'Marketing'
            case 'ads': return 'Ads'
            case 'crm': return 'Software'
            default: return 'Otro'
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Servicios & Suscripciones</h2>
                    <p className="text-muted-foreground mt-1">Gestiona todos los servicios recurrentes de tus clientes</p>
                </div>
                <AddServiceModal
                    onSuccess={fetchServices}
                    trigger={
                        <Button className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Servicio
                        </Button>
                    }
                />
            </div>

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
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            <SelectItem value="hosting">Hosting</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="ads">Ads</SelectItem>
                            <SelectItem value="crm">Software</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead>Servicio</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Frecuencia</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Próximo Cobro</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Estado Factura</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                    Cargando servicios...
                                </TableCell>
                            </TableRow>
                        ) : filteredServices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                    No se encontraron servicios
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredServices.map((service) => (
                                <TableRow key={service.id} className="hover:bg-gray-50/50">
                                    <TableCell className="font-medium text-gray-900">{service.name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{service.client?.name}</span>
                                            <span className="text-xs text-gray-500">{service.client?.company_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-gray-600">
                                            {getServiceIcon(service.service_type)}
                                            <span>{getServiceLabel(service.service_type)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="capitalize text-gray-600">
                                        {service.frequency === 'one-time' ? 'Único' :
                                            service.frequency === 'biweekly' ? 'Quincenal' :
                                                service.frequency === 'monthly' ? 'Mensual' : 'Anual'}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        ${service.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {service.next_billing_date ? (
                                            <span className={cn(
                                                "font-medium",
                                                new Date(service.next_billing_date) < new Date() ? "text-red-600" : "text-gray-600"
                                            )}>
                                                {new Date(service.next_billing_date).toLocaleDateString()}
                                            </span>
                                        ) : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "font-normal",
                                            service.status === 'active' ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-100" : "bg-gray-100 text-gray-700 border-gray-200"
                                        )}>
                                            {service.status === 'active' ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {service.invoice ? (
                                            <Badge className={cn(
                                                "font-normal",
                                                service.invoice.status === 'paid' ? "bg-green-100 text-green-700 border-green-200" :
                                                    service.invoice.status === 'pending' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                                        "bg-red-100 text-red-700 border-red-200"
                                            )}>
                                                {service.invoice.status === 'paid' ? 'Pagada' :
                                                    service.invoice.status === 'pending' ? 'Pendiente' : 'Vencida'}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Sin factura</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {service.invoice && (
                                                <Link href={`/invoices/${service.invoice.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {service.status !== 'active' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-400 hover:text-red-600"
                                                    onClick={() => handleDeleteService(service.id)}
                                                    disabled={deletingId === service.id}
                                                >
                                                    {deletingId === service.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            )}
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
