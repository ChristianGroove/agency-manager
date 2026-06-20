"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/modules/core/database/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, Search, ListFilter, CreditCard } from "lucide-react"
import { SectionHeader } from "@/components/layout/section-header"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/modules/infrastructure/utils/utils"
import { SplitText } from "@/components/ui/split-text"
import { SearchFilterBar, FilterOption } from "@/modules/core/ui/components/search-filter-bar"

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
            const { getPaymentTransactions } = await import("@/modules/features/billing/billing-actions")
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

    const counts = {
        all: transactions.length,
        approved: transactions.filter(t => t.status === 'APPROVED').length,
        declined: transactions.filter(t => t.status === 'DECLINED').length,
        error: transactions.filter(t => t.status === 'ERROR').length
    }

    const filterOptions: FilterOption[] = [
        { id: 'all', label: 'Todos', count: counts.all, color: 'zinc' },
        { id: 'APPROVED', label: 'Aprobadas', count: counts.approved, color: 'emerald' },
        { id: 'DECLINED', label: 'Rechazadas', count: counts.declined, color: 'red' },
        { id: 'ERROR', label: 'Error', count: counts.error, color: 'red' },
    ]

    return (
        <div className="space-y-8">
            {/* Standardized Header */}
            <SectionHeader
                title="Historial de Pagos"
                subtitle="Gestiona y visualiza todas las transacciones recibidas."
                icon={CreditCard}
            />

            <SearchFilterBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar por referencia..."
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
                filters={filterOptions}
            />

            <div className="glass-card rounded-2xl overflow-hidden relative">
                <Table>
                    <TableHeader>
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
                                <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Cargando transacciones...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredTransactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                    No se encontraron transacciones.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTransactions.map((tx) => (
                                <TableRow key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-white/5 border-zinc-100 dark:border-white/5">
                                    <TableCell className="text-zinc-500">
                                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-zinc-600">{tx.reference}</TableCell>
                                    <TableCell className="font-medium text-zinc-900 dark:text-white">
                                        ${(tx.amount_in_cents / 100).toLocaleString()} {tx.currency}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "font-normal border-transparent",
                                            tx.status === 'APPROVED'
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                        )}>
                                            {tx.status === 'APPROVED' ? 'Aprobada' : tx.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-700">
                                            {tx.invoice_ids?.length || 0}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(tx)} className="text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50">
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
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-zinc-100 dark:border-white/10 flex justify-between items-center bg-zinc-50/50 dark:bg-white/5">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Detalle de Transacción</h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">✕</Button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-zinc-500 mb-1">Referencia</p>
                                    <p className="font-mono text-zinc-900 dark:text-zinc-100 text-xs">{selectedTransaction.reference}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 mb-1">Fecha</p>
                                    <p className="font-medium text-zinc-900 dark:text-white">{new Date(selectedTransaction.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 mb-1">Monto Total</p>
                                    <p className="font-bold text-indigo-600 text-lg">
                                        ${(selectedTransaction.amount_in_cents / 100).toLocaleString()} {selectedTransaction.currency}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 mb-1">Estado</p>
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
                                <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Facturas Asociadas</h4>
                                {loadingDetails ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                                    </div>
                                ) : (
                                    <div className="border border-zinc-200 rounded-lg overflow-hidden">
                                        {linkedInvoices.length > 0 ? (
                                            <div className="divide-y divide-zinc-100">
                                                {linkedInvoices.map((inv) => (
                                                    <div key={inv.id} className="p-3 bg-zinc-50/50 flex justify-between items-center text-sm">
                                                        <div>
                                                            <p className="font-bold text-zinc-900">#{inv.number}</p>
                                                            <p className="text-xs text-zinc-500">{new Date(inv.date).toLocaleDateString()}</p>
                                                        </div>
                                                        <p className="font-medium text-zinc-700">${inv.total.toLocaleString()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="p-4 text-center text-zinc-500 text-sm">No se encontró información de las facturas.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-zinc-100 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5 flex justify-end">
                            <Button onClick={() => setSelectedTransaction(null)} variant="outline">Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

