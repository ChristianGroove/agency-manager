"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Download, Search, Filter, Eye, Trash2, Loader2, Edit, ListFilter } from "lucide-react"
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
import { StatusBadge } from "@/components/ui/status-badge"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { CreateInvoiceSheet } from "@/components/modules/invoices/create-invoice-sheet"
import { SplitText } from "@/components/ui/split-text"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { MoreVertical } from "lucide-react"

import { Invoice } from "@/types"

export default function InvoicesPage() {
    const router = useRouter()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [showFilters, setShowFilters] = useState(false)
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
            .is('deleted_at', null)
            .order('date', { ascending: false })

        if (data) setInvoices(data as unknown as Invoice[]) // Cast to new type
        setLoading(false)
    }

    useEffect(() => {
        fetchInvoices()
    }, [])

    const handleDeleteInvoice = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este documento de cobro?")) return

        setDeletingId(id)
        try {
            // Soft delete the invoice
            const { error } = await supabase
                .from('invoices')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error
            await fetchInvoices()
        } catch (error) {
            console.error("Error deleting invoice:", error)
            alert("Error al eliminar el documento")
        } finally {
            setDeletingId(null)
        }
    }

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch =
            invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || ''

        const matchesStatus = statusFilter === "all" || invoice.status === statusFilter

        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        <SplitText>Documentos de Cobro</SplitText>
                    </h2>
                    <p className="text-muted-foreground mt-1">Gestiona todos los documentos emitidos.</p>
                </div>
                <div className="w-full md:w-auto">
                    <CreateInvoiceSheet
                        onSuccess={fetchInvoices}
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
                            placeholder="Buscar por número o cliente..."
                            className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full outline-none text-gray-700 placeholder:text-gray-400 h-9 p-0 shadow-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Vertical Divider (Desktop) */}
                    <div className="h-6 w-px bg-gray-200 hidden md:block" />

                    {/* Collapsible Filter Pills (Middle) */}
                    <div className={cn(
                        "flex items-center gap-1.5 overflow-hidden transition-all duration-300 ease-in-out",
                        showFilters ? "max-w-[800px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0 p-0 pointer-events-none"
                    )}>
                        <div className="flex items-center gap-1.5 min-w-max">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden lg:block">Estado</span>
                            {[
                                { id: 'all', label: 'Todos', color: 'gray' },
                                { id: 'paid', label: 'Pagadas', color: 'green' },
                                { id: 'pending', label: 'Pendientes', color: 'yellow' },
                                { id: 'overdue', label: 'Vencidas', color: 'red' },
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                        statusFilter === filter.id
                                            ? filter.id === 'paid' ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 shadow-sm"
                                                : filter.id === 'pending' ? "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20 shadow-sm"
                                                    : filter.id === 'overdue' ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 shadow-sm"
                                                        : "bg-gray-900 text-white shadow-sm"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <span>{filter.label}</span>
                                </button>
                            ))}
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
                                ? "bg-gray-100 text-gray-900 border-gray-200 shadow-inner"
                                : "bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900"
                        )}
                        title="Filtrar Documentos"
                    >
                        <ListFilter className="h-4 w-4" />
                    </button>
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
                                    Cargando documentos...
                                </TableCell>
                            </TableRow>
                        ) : filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    No se encontraron documentos de cobro
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
                                        <StatusBadge status={invoice.status} type="invoice" entity={invoice} />
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
                                                    <span>Ver Documento</span>
                                                </DropdownMenuItem>
                                                <CreateInvoiceSheet
                                                    invoiceToEdit={invoice}
                                                    onSuccess={fetchInvoices}
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
        </div >
    )
}
