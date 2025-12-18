"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, Search } from "lucide-react"
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
    const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null)
    const [linkedInvoices, setLinkedInvoices] = useState<Invoice[]>([])
    const [loadingDetails, setLoadingDetails] = useState(false)

    useEffect(() => {
        fetchTransactions()
    }, [])

    const fetchTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('payment_transactions')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
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

    const filteredTransactions = transactions.filter(t =>
        t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.status.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Historial de Pagos</h2>
                    <p className="text-muted-foreground mt-1">Gestiona y visualiza todas las transacciones recibidas.</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por referencia..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
