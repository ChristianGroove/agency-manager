"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, Search, CreditCard } from "lucide-react"
import { Input } from "@/components/ui/input"

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
                    <h2 className="text-3xl font-bold tracking-tight text-white">Historial de Pagos</h2>
                    <p className="text-zinc-400 mt-2">Gestiona y visualiza todas las transacciones recibidas.</p>
                </div>
            </div>

            <Card className="bg-brand-dark border-white/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-brand-pink" />
                            Transacciones
                        </CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Buscar por referencia..."
                                className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-brand-pink" />
                        </div>
                    ) : (
                        <div className="rounded-md border border-white/5">
                            <table className="w-full text-sm text-left text-zinc-400">
                                <thead className="bg-white/5 text-zinc-200 font-medium border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Referencia</th>
                                        <th className="px-6 py-4">Monto</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4 text-center">Facturas</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">{tx.reference}</td>
                                            <td className="px-6 py-4 font-bold text-white">
                                                ${(tx.amount_in_cents / 100).toLocaleString()} {tx.currency}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={tx.status === 'APPROVED' ? 'default' : 'destructive'} className={tx.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20' : ''}>
                                                    {tx.status === 'APPROVED' ? 'Aprobada' : tx.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant="secondary" className="bg-white/5 text-zinc-300">
                                                    {tx.invoice_ids?.length || 0}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(tx)} className="hover:text-brand-cyan hover:bg-brand-cyan/10">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Ver Detalle
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                                                No se encontraron transacciones.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTransaction(null)}>
                    <div className="bg-brand-dark border border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Detalle de Transacción</h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(null)} className="text-zinc-400 hover:text-white">✕</Button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-zinc-500 mb-1">Referencia</p>
                                    <p className="font-mono text-zinc-300 text-xs">{selectedTransaction.reference}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 mb-1">Fecha</p>
                                    <p className="font-medium text-white">{new Date(selectedTransaction.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 mb-1">Monto Total</p>
                                    <p className="font-bold text-brand-cyan text-lg">
                                        ${(selectedTransaction.amount_in_cents / 100).toLocaleString()} {selectedTransaction.currency}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 mb-1">Estado</p>
                                    <Badge variant={selectedTransaction.status === 'APPROVED' ? 'default' : 'destructive'}>
                                        {selectedTransaction.status}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Facturas Asociadas</h4>
                                {loadingDetails ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-brand-pink" />
                                    </div>
                                ) : (
                                    <div className="border border-white/10 rounded-lg overflow-hidden">
                                        {linkedInvoices.length > 0 ? (
                                            <div className="divide-y divide-white/5">
                                                {linkedInvoices.map((inv) => (
                                                    <div key={inv.id} className="p-3 bg-white/5 flex justify-between items-center text-sm">
                                                        <div>
                                                            <p className="font-bold text-white">#{inv.number}</p>
                                                            <p className="text-xs text-zinc-500">{new Date(inv.date).toLocaleDateString()}</p>
                                                        </div>
                                                        <p className="font-medium text-zinc-300">${inv.total.toLocaleString()}</p>
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
                        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                            <Button onClick={() => setSelectedTransaction(null)} className="bg-white/10 hover:bg-white/20 text-white">Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
