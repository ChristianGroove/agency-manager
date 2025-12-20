"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Download, Search, Filter, Eye, Trash2, Loader2, Edit } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { CreateInvoiceModal } from "@/components/modules/invoices/create-invoice-modal"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { MoreVertical } from "lucide-react"

interface Invoice {
    id: string
    number: string
    date: string
    due_date: string
    total: number
    status: string
    client: {
        name: string
    }
}

export default function InvoicesPage() {
    const router = useRouter()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchInvoices = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                client:clients(name)
            `)
            .order('date', { ascending: false })

        if (data) setInvoices(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchInvoices()
    }, [])

    const handleDeleteInvoice = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer.")) return

        setDeletingId(id)
        try {
            // First, clear any subscription references to this invoice
            const { error: subUpdateError } = await supabase
                .from('subscriptions')
                .update({ invoice_id: null })
                .eq('invoice_id', id)

            if (subUpdateError) {
                console.warn("Warning updating subscriptions:", subUpdateError)
                // Continue anyway as ON DELETE SET NULL should handle this
            }

            // Then delete the invoice
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id)

            if (error) throw error
            await fetchInvoices()
        } catch (error) {
            console.error("Error deleting invoice:", error)
            alert("Error al eliminar la factura")
        } finally {
            setDeletingId(null)
        }
    }

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch =
            invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.client?.name.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || invoice.status === statusFilter

        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Cuentas de Cobro</h2>
                    <p className="text-muted-foreground mt-1">Gestiona todas las cuentas de cobro emitidas</p>
                </div>
                <div className="w-full md:w-auto">
                    <CreateInvoiceModal
                        onInvoiceCreated={fetchInvoices}
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por número o cliente..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="paid">Pagadas</SelectItem>
                            <SelectItem value="pending">Pendientes</SelectItem>
                            <SelectItem value="overdue">Vencidas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Vencimiento</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    Cargando facturas...
                                </TableCell>
                            </TableRow>
                        ) : filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    No se encontraron facturas
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((invoice) => (
                                <TableRow key={invoice.id} className="hover:bg-gray-50/50">
                                    <TableCell className="font-medium text-gray-900">{invoice.number}</TableCell>
                                    <TableCell className="font-medium text-gray-700">{invoice.client?.name}</TableCell>
                                    <TableCell className="text-gray-500">{new Date(invoice.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-gray-500">
                                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        ${invoice.total.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "font-normal",
                                            invoice.status === 'paid' ? "bg-green-100 text-green-700 border-green-200" :
                                                invoice.status === 'pending' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                                    "bg-red-100 text-red-700 border-red-200"
                                        )}>
                                            {invoice.status === 'paid' ? 'Pagada' :
                                                invoice.status === 'pending' ? 'Pendiente' : 'Vencida'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Abrir menú</span>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    <span>Ver Detalles</span>
                                                </DropdownMenuItem>
                                                <CreateInvoiceModal
                                                    invoiceToEdit={invoice}
                                                    onInvoiceCreated={fetchInvoices}
                                                    trigger={
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            <span>Editar</span>
                                                        </DropdownMenuItem>
                                                    }
                                                />
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Eliminar</span>
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
        </div>
    )
}
