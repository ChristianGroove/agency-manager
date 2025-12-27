"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, Search, ListFilter } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { SplitText } from "@/components/ui/split-text"

interface PaymentTransaction {
    id: string
    reference: string
    amount_in_cents: number
    currency: string
    status: string
    invoice_ids: string[]
    created_at: string
}

interface Invoice {
    id: string
    number: string
    total: number
    date: string
}

export default function PaymentsPage() {
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [statusFilter, setStatusFilter] = useState("all")
    const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null)
    const [linkedInvoices, setLinkedInvoices] = useState<Invoice[]>([])
    const [loadingDetails, setLoadingDetails] = useState(false)

    useEffect(() => {
        fetchTransactions()
    }, [])

    const fetchTransactions = async () => {
        try {
            const { getPaymentTransactions } = await import("@/app/actions/payments-actions")
            const data = await getPaymentTransactions()
            setTransactions(data || [])
        } catch (error) {
            console.error('Error fetching transactions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleViewDetails = async (transaction: PaymentTransaction) => {
        setSelectedTransaction(transaction)
        setLoadingDetails(true)
        try {
            if (transaction.invoice_ids && transaction.invoice_ids.length > 0) {
                const { data, error } = await supabase
                    .from('invoices')
                    .select('id, number, total, date')
                    .in('id', transaction.invoice_ids)

                if (error) throw error
                setLinkedInvoices(data || [])
            } else {
                setLinkedInvoices([])
            }
        } catch (error) {
            console.error('Error fetching linked invoices:', error)
        } finally {
            setLoadingDetails(false)
        }
    }

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch =
            t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.status.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'all' || t.status === statusFilter

        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        <SplitText>Historial de Pagos</SplitText>
                    </h2>
                    <p className="text-muted-foreground mt-1">Gestiona y visualiza todas las transacciones recibidas.</p>
                </div>
            </div>

            {/* Unified Control Block */}
            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex flex-col md:flex-row items-center gap-2 flex-1 transition-all hover:shadow-md">
                    {/* Integrated Search */}
                    <div className="relative flex-1 w-full md:w-auto min-w-[200px] flex items-center px-3 gap-2">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <Input
                            placeholder="Buscar por referencia..."
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
                                { id: 'APPROVED', label: 'Aprobadas', color: 'green' },
                                { id: 'DECLINED', label: 'Rechazadas', color: 'red' },
                                { id: 'ERROR', label: 'Error', color: 'red' },
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                        statusFilter === filter.id
                                            ? filter.id === 'APPROVED' ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 shadow-sm"
                                                : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 shadow-sm"
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
                        title="Filtrar Pagos"
                    >
                        <ListFilter className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Referencia</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-center">Facturas</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Cargando transacciones...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredTransactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    No se encontraron transacciones.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTransactions.map((tx) => (
                                <TableRow key={tx.id} className="hover:bg-gray-50/50">
                                    <TableCell className="text-gray-500">
                                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-gray-600">{tx.reference}</TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        ${(tx.amount_in_cents / 100).toLocaleString()} {tx.currency}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "font-normal",
                                            tx.status === 'APPROVED'
                                                ? "bg-green-100 text-green-700 border-green-200"
                                                : "bg-red-100 text-red-700 border-red-200"
                                        )}>
                                            {tx.status === 'APPROVED' ? 'Aprobada' : tx.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                                            {tx.invoice_ids?.length || 0}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(tx)} className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50">
                                            <Eye className="h-4 w-4 mr-2" />
                                            Ver Detalle
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTransaction(null)}>
                    <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">Detalle de Transacción</h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(null)} className="text-gray-400 hover:text-gray-900">✕</Button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">Referencia</p>
                                    <p className="font-mono text-gray-900 text-xs">{selectedTransaction.reference}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Fecha</p>
                                    <p className="font-medium text-gray-900">{new Date(selectedTransaction.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Monto Total</p>
                                    <p className="font-bold text-indigo-600 text-lg">
                                        ${(selectedTransaction.amount_in_cents / 100).toLocaleString()} {selectedTransaction.currency}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Estado</p>
                                    <Badge variant="outline" className={cn(
                                        "font-normal",
                                        selectedTransaction.status === 'APPROVED'
                                            ? "bg-green-100 text-green-700 border-green-200"
                                            : "bg-red-100 text-red-700 border-red-200"
                                    )}>
                                        {selectedTransaction.status === 'APPROVED' ? 'Aprobada' : selectedTransaction.status}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Facturas Asociadas</h4>
                                {loadingDetails ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        {linkedInvoices.length > 0 ? (
                                            <div className="divide-y divide-gray-100">
                                                {linkedInvoices.map((inv) => (
                                                    <div key={inv.id} className="p-3 bg-gray-50/50 flex justify-between items-center text-sm">
                                                        <div>
                                                            <p className="font-bold text-gray-900">#{inv.number}</p>
                                                            <p className="text-xs text-gray-500">{new Date(inv.date).toLocaleDateString()}</p>
                                                        </div>
                                                        <p className="font-medium text-gray-700">${inv.total.toLocaleString()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="p-4 text-center text-gray-500 text-sm">No se encontró información de las facturas.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <Button onClick={() => setSelectedTransaction(null)} variant="outline">Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
