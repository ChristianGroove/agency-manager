"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Download, Eye, Loader2, Trash, MoreVertical } from "lucide-react"
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

export default function QuotesPage() {
    const router = useRouter()
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)

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
                .delete()
                .eq('id', id)

            if (error) throw error

            // Update local state
            setQuotes(quotes.filter(q => q.id !== id))
        } catch (error) {
            console.error("Error deleting quote:", error)
            alert("Error al eliminar la cotización")
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Cotizaciones</h2>
                <Link href="/quotes/new" className="w-full md:w-auto">
                    <Button className="w-full md:w-auto bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Cotización
                    </Button>
                </Link>
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
                        ) : quotes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No hay cotizaciones registradas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            quotes.map((quote) => {
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
