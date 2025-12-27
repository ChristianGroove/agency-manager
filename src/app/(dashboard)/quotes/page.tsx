"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CreateQuoteSheet } from "@/components/modules/quotes/create-quote-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Download, Eye, Loader2, Trash, MoreVertical, Search, ListFilter, Copy, Send, CheckCircle, RefreshCcw, FileCheck } from "lucide-react"
import { cn } from "@/lib/utils"
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
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { Quote } from "@/types"
import { SplitText } from "@/components/ui/split-text"
import { toast } from "sonner"
import { duplicateQuote, updateQuoteStatus } from "@/lib/actions/quotes"
import { convertQuote } from "@/app/actions/quote-conversion"

export default function QuotesPage() {
    const router = useRouter()
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [statusFilter, setStatusFilter] = useState("all")
    const [emitters, setEmitters] = useState<any[]>([])

    useEffect(() => {
        fetchQuotes()
        fetchEmitters()
    }, [])

    const fetchEmitters = async () => {
        const { data } = await supabase.from('emitters').select('*').eq('is_active', true)
        if (data) setEmitters(data)
    }

    const fetchQuotes = async () => {
        try {
            const { getQuotes } = await import("@/app/actions/quotes-actions")
            const data = await getQuotes()
            setQuotes(data || [])
        } catch (error) {
            console.error("Error fetching quotes:", error)
            toast.error("Error al cargar cotizaciones")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta cotización?")) return

        try {
            const { error } = await supabase
                .from('quotes')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error

            setQuotes(quotes.filter(q => q.id !== id))
            toast.success("Cotización eliminada")
        } catch (error) {
            console.error("Error deleting quote:", error)
            toast.error("Error al eliminar")
        }
    }

    const handleDuplicate = async (quote: Quote) => {
        setActionLoading(quote.id)
        try {
            const res = await duplicateQuote(quote.id)
            if (res.success && res.quote) {
                toast.success("Cotización duplicada como borrador")
                fetchQuotes() // Refresh list
                router.push(`/quotes/${res.quote.id}`)
            } else {
                throw new Error(res.error)
            }
        } catch (error: any) {
            toast.error("Error al duplicar: " + error.message)
        } finally {
            setActionLoading(null)
        }
    }

    const handleConvert = async (quote: Quote) => {
        if (!confirm(`¿Confirmas que deseas convertir la cotización ${quote.number} en factura/servicios?`)) return

        setActionLoading(quote.id)
        try {
            const res = await convertQuote(quote.id)
            if (res.success) {
                toast.success("Cotización convertida exitosamente")
                fetchQuotes()
                // Update local state to reflect change immediately if fetch is slow
                setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'converted' } : q))
            } else {
                throw new Error(res.error)
            }
        } catch (error: any) {
            toast.error("Error al convertir: " + error.message)
        } finally {
            setActionLoading(null)
        }
    }

    const handleSend = async (quote: Quote) => {
        setActionLoading(quote.id)
        try {
            // For now, just update status. In future, open email modal.
            const res = await updateQuoteStatus(quote.id, 'sent')
            if (res.success) {
                toast.success("Estado actualizado a Enviada")
                setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'sent' } : q))
            } else {
                throw new Error(res.error)
            }
        } catch (error: any) {
            toast.error("Error al actualizar: " + error.message)
        } finally {
            setActionLoading(null)
        }
    }

    const filteredQuotes = quotes.filter(quote => {
        const entityName = quote.client?.name || quote.lead?.name || ""
        const entityCompany = quote.client?.company_name || quote.lead?.company_name || ""

        const matchesSearch =
            quote.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entityCompany.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'all' || quote.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const statusConfig = {
        draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
        sent: { label: 'Enviada', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
        accepted: { label: 'Aprobada', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
        converted: { label: 'Facturada', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 ring-1 ring-purple-600/20' },
        rejected: { label: 'Rechazada', color: 'bg-red-50 text-red-700 hover:bg-red-100' },
        expired: { label: 'Vencida', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        <SplitText>Cotizaciones</SplitText>
                    </h2>
                    <p className="text-muted-foreground mt-1">Gestiona el ciclo de vida de tus propuestas comerciales.</p>
                </div>
                <div className="w-full md:w-auto">
                    <CreateQuoteSheet emitters={emitters} />
                </div>
            </div>

            {/* Unified Control Block */}
            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex flex-col md:flex-row items-center gap-2 flex-1 transition-all hover:shadow-md">
                    {/* Integrated Search */}
                    <div className="relative flex-1 w-full md:w-auto min-w-[200px] flex items-center px-3 gap-2">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <Input
                            placeholder="Buscar por número, cliente o prospecto..."
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
                                { id: 'all', label: 'Todos' },
                                ...Object.entries(statusConfig).map(([key, val]) => ({ id: key, label: val.label }))
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                        statusFilter === filter.id
                                            ? "bg-gray-900 text-white shadow-sm"
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
                        title="Filtrar Cotizaciones"
                    >
                        <ListFilter className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-[120px]">Número</TableHead>
                            <TableHead>Cliente / Prospecto</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Total & Info</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Cargando...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredQuotes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No se encontraron cotizaciones.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredQuotes.map((quote) => {
                                const entityName = quote.client?.name || quote.lead?.name || "Desconocido"
                                const entityCompany = quote.client?.company_name || quote.lead?.company_name
                                const status = statusConfig[quote.status as keyof typeof statusConfig] || statusConfig.draft
                                const hasRecurring = quote.items?.some(i => i.is_recurring)

                                return (
                                    <TableRow key={quote.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <TableCell className="font-medium text-gray-900">{quote.number}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-700">{entityName}</span>
                                                {entityCompany && <span className="text-xs text-gray-400">{entityCompany}</span>}
                                                {quote.lead_id && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full w-fit mt-1 font-medium">Prospecto</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">{new Date(quote.date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900">${quote.total.toLocaleString()}</span>
                                                {hasRecurring && (
                                                    <span className="bg-indigo-50 text-indigo-600 p-1 rounded-md" title="Incluye items recurrentes (Suscripción)">
                                                        <RefreshCcw className="h-3 w-3" />
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all",
                                                status.color
                                            )}>
                                                {/* Status Icon could go here */}
                                                {quote.status === 'converted' && <CheckCircle className="h-3 w-3" />}
                                                {status.label}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {actionLoading === quote.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin inline-block text-gray-400" />
                                            ) : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="sr-only">Abrir menú</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem onClick={() => router.push(`/quotes/${quote.id}`)}>
                                                            <Eye className="mr-2 h-4 w-4 text-gray-400" />
                                                            <span>Ver Detalle</span>
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem onClick={() => handleDuplicate(quote)}>
                                                            <Copy className="mr-2 h-4 w-4 text-gray-400" />
                                                            <span>Duplicar</span>
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem disabled>
                                                            <Download className="mr-2 h-4 w-4 text-gray-400" />
                                                            <span>Descargar PDF</span>
                                                        </DropdownMenuItem>

                                                        <DropdownMenuSeparator />

                                                        {quote.status === 'draft' && (
                                                            <DropdownMenuItem onClick={() => handleSend(quote)} className="text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                                                                <Send className="mr-2 h-4 w-4" />
                                                                <span>Marcar Enviada</span>
                                                            </DropdownMenuItem>
                                                        )}

                                                        {quote.status === 'accepted' && (
                                                            <DropdownMenuItem onClick={() => handleConvert(quote)} className="text-purple-600 focus:text-purple-700 focus:bg-purple-50 font-medium">
                                                                <FileCheck className="mr-2 h-4 w-4" />
                                                                <span>Convertir a Factura</span>
                                                            </DropdownMenuItem>
                                                        )}

                                                        {(quote.status === 'draft' || quote.status === 'rejected') && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete(quote.id)}
                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                >
                                                                    <Trash className="mr-2 h-4 w-4" />
                                                                    <span>Eliminar</span>
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
