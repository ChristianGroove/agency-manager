"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, FileText, Download, Eye, Loader2, Trash, MoreVertical, Search, ListFilter } from "lucide-react"
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
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { Quote } from "@/types"
import { SplitText } from "@/components/ui/split-text"

export default function QuotesPage() {
    const router = useRouter()
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [statusFilter, setStatusFilter] = useState("all")

    useEffect(() => {
        fetchQuotes()
    }, [])

    const fetchQuotes = async () => {
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select(`
                    *,
                    client:clients (name, company_name),
                    lead:leads (name, company_name)
                `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            if (error) throw error
            setQuotes(data || [])
        } catch (error) {
            console.error("Error fetching quotes:", error)
        } finally {
            setLoading(false)
        }
    }

    const deleteQuote = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta cotización?")) return

        try {
            const { error } = await supabase
                .from('quotes')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error

            // Update local state
            setQuotes(quotes.filter(q => q.id !== id))
        } catch (error) {
            console.error("Error deleting quote:", error)
            alert("Error al eliminar la cotización")
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

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        <SplitText>Cotizaciones</SplitText>
                    </h2>
                    <p className="text-muted-foreground mt-1">Gestiona las cotizaciones y propuestas comerciales de tus clientes.</p>
                </div>
                <div className="w-full md:w-auto">
                    <Link href="/quotes/new">
                        <Button className="w-full md:w-auto bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Cotización
                        </Button>
                    </Link>
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
                                { id: 'all', label: 'Todos', color: 'gray' },
                                { id: 'draft', label: 'Borrador', color: 'gray' },
                                { id: 'sent', label: 'Enviadas', color: 'blue' },
                                { id: 'accepted', label: 'Aprobadas', color: 'green' },
                                { id: 'rejected', label: 'Rechazadas', color: 'red' },
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                        statusFilter === filter.id
                                            ? filter.id === 'draft' ? "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-600/20 shadow-sm"
                                                : filter.id === 'sent' ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 shadow-sm"
                                                    : filter.id === 'accepted' ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 shadow-sm"
                                                        : filter.id === 'rejected' ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 shadow-sm"
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
                        title="Filtrar Cotizaciones"
                    >
                        <ListFilter className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Cliente / Prospecto</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <div className="flex justify-center items-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredQuotes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No hay cotizaciones que coincidan con los filtros.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredQuotes.map((quote) => {
                                const entityName = quote.client?.name || quote.lead?.name || "Desconocido"
                                const entityCompany = quote.client?.company_name || quote.lead?.company_name

                                return (
                                    <TableRow key={quote.id}>
                                        <TableCell className="font-medium">{quote.number}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{entityName}</span>
                                                {entityCompany && <span className="text-xs text-muted-foreground">{entityCompany}</span>}
                                                {quote.lead_id && <span className="text-[10px] text-yellow-600 font-medium">Prospecto</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(quote.date).toLocaleDateString()}</TableCell>
                                        <TableCell>${quote.total.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${quote.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                    quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {quote.status === 'draft' ? 'Borrador' :
                                                    quote.status === 'sent' ? 'Enviada' :
                                                        quote.status === 'accepted' ? 'Aprobada' : 'Rechazada'}
                                            </div>
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
                                                    <DropdownMenuItem onClick={() => router.push(`/quotes/${quote.id}`)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        <span>Ver Detalle</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Download className="mr-2 h-4 w-4" />
                                                        <span>Descargar PDF</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => deleteQuote(quote.id)}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        <span>Eliminar</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
