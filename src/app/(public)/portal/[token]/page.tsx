"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getPortalData } from "@/app/actions/portal-actions"
import { Client, Invoice } from "@/types"
import { Loader2, AlertCircle, CheckCircle2, Clock, Download, CreditCard, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function PortalPage() {
    const params = useParams()
    const [client, setClient] = useState<Client | null>(null)
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)

    useEffect(() => {
        if (params.token) {
            fetchData(params.token as string)
        }
    }, [params.token])

    const fetchData = async (token: string) => {
        try {
            const { client, invoices } = await getPortalData(token)
            setClient(client)
            setInvoices(invoices)
        } catch (err) {
            console.error(err)
            setError("No se pudo cargar la información. El enlace puede ser inválido.")
        } finally {
            setLoading(false)
        }
    }

    const toggleInvoice = (invoiceId: string) => {
        setSelectedInvoices(prev =>
            prev.includes(invoiceId)
                ? prev.filter(id => id !== invoiceId)
                : [...prev, invoiceId]
        )
    }

    const toggleAll = () => {
        const pendingInvoices = invoices.filter(i => i.status !== 'paid').map(i => i.id)
        if (selectedInvoices.length === pendingInvoices.length) {
            setSelectedInvoices([])
        } else {
            setSelectedInvoices(pendingInvoices)
        }
    }

    const handlePay = async () => {
        if (selectedInvoices.length === 0) return

        setIsProcessing(true)
        try {
            const response = await fetch('/api/wompi/signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceIds: selectedInvoices })
            })

            if (!response.ok) throw new Error('Error generating signature')

            const { reference, amountInCents, currency, signature, publicKey } = await response.json()

            const redirectUrl = window.location.href

            const wompiUrl = `https://checkout.wompi.co/p/?public-key=${publicKey}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${reference}&signature:integrity=${signature}&redirect-url=${encodeURIComponent(redirectUrl)}&customer-data:email=${client?.email || ''}&customer-data:full-name=${encodeURIComponent(client?.name || '')}`

            window.location.href = wompiUrl

        } catch (error) {
            console.error('Payment error:', error)
            alert('Error al iniciar el pago')
            setIsProcessing(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-pink" /></div>
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
    if (!client) return null

    const getInvoiceStatus = (invoice: Invoice) => {
        if (invoice.status === 'paid') return 'paid'
        if (invoice.due_date && new Date(invoice.due_date) < new Date()) return 'overdue'
        return invoice.status
    }

    const pendingInvoices = invoices.filter(i => getInvoiceStatus(i) !== 'paid')

    const totalSelected = invoices
        .filter(i => selectedInvoices.includes(i.id))
        .reduce((acc, curr) => acc + curr.total, 0)

    const pendingTotal = invoices
        .filter(i => {
            const status = getInvoiceStatus(i)
            return status === 'pending' || status === 'overdue'
        })
        .reduce((acc, curr) => acc + curr.total, 0)

    const overdueTotal = invoices
        .filter(i => getInvoiceStatus(i) === 'overdue')
        .reduce((acc, curr) => acc + curr.total, 0)

    const getGreetingMessage = () => {
        if (overdueTotal > 0) {
            return (
                <p className="text-red-500 font-medium">
                    Tienes facturas vencidas que requieren tu atención inmediata.
                </p>
            )
        }
        if (pendingTotal > 0) {
            return (
                <p className="text-gray-600">
                    A continuación encontrarás el resumen de tu estado de cuenta.
                </p>
            )
        }
        return (
            <p className="text-green-600 font-medium">
                ¡Estás al día! No tienes pagos pendientes.
            </p>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col items-center gap-6 text-center mb-12">
                    <img src="/branding/logo dark.svg" alt="Pixy" className="h-10 mb-6 mx-auto" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Hola, {client.name}</h1>
                        {getGreetingMessage()}
                    </div>
                </div>

                {/* Invoices List */}
                <div className="space-y-4">
                    {pendingTotal > 0 && (
                        <p className="text-sm text-gray-500 font-medium text-center">Selecciona las facturas que deseas pagar:</p>
                    )}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                    <tr>
                                        <th className="px-6 py-4 w-12">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
                                                checked={pendingInvoices.length > 0 && selectedInvoices.length === pendingInvoices.length}
                                                onChange={toggleAll}
                                                disabled={pendingInvoices.length === 0}
                                            />
                                        </th>
                                        <th className="px-6 py-4">Factura</th>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4 text-right">Monto</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {invoices.map((invoice) => {
                                        const status = getInvoiceStatus(invoice)
                                        return (
                                            <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    {status !== 'paid' && (
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
                                                            checked={selectedInvoices.includes(invoice.id)}
                                                            onChange={() => toggleInvoice(invoice.id)}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900">#{invoice.number}</td>
                                                <td className="px-6 py-4 text-gray-600">{new Date(invoice.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={status === 'paid' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'}>
                                                        {status === 'paid' ? 'Pagada' : status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">${invoice.total.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => setViewInvoice(invoice)}>
                                                        Ver Detalle
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {invoices.map((invoice) => {
                                const status = getInvoiceStatus(invoice)
                                return (
                                    <div key={invoice.id} className="p-4 flex items-center gap-4">
                                        {status !== 'paid' && (
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
                                                checked={selectedInvoices.includes(invoice.id)}
                                                onChange={() => toggleInvoice(invoice.id)}
                                            />
                                        )}
                                        <div className="flex-1" onClick={() => setViewInvoice(invoice)}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-gray-900">#{invoice.number}</span>
                                                <Badge variant={status === 'paid' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'}>
                                                    {status === 'paid' ? 'Pagada' : status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-xs text-gray-500">{new Date(invoice.date).toLocaleDateString()}</span>
                                                <span className="font-bold text-gray-900">${invoice.total.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            {selectedInvoices.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50 animate-in slide-in-from-bottom">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total a Pagar ({selectedInvoices.length})</p>
                            <p className="text-2xl font-bold text-gray-900">${totalSelected.toLocaleString()}</p>
                        </div>
                        <Button
                            size="lg"
                            className="bg-brand-pink hover:bg-brand-pink/90 text-white px-8"
                            onClick={handlePay}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                            Pagar Ahora
                        </Button>
                    </div>
                </div>
            )}

            {/* Invoice Detail Modal */}
            {viewInvoice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewInvoice(null)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold">Factura #{viewInvoice.number}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setViewInvoice(null)}>✕</Button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Fecha de Emisión</p>
                                    <p className="font-medium">{new Date(viewInvoice.date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Fecha de Vencimiento</p>
                                    <p className="font-medium">{viewInvoice.due_date ? new Date(viewInvoice.due_date).toLocaleDateString() : '-'}</p>
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                                {viewInvoice.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span>{item.description} <span className="text-gray-400">x{item.quantity}</span></span>
                                        <span className="font-medium">${(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>${viewInvoice.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end">
                            <Button onClick={() => setViewInvoice(null)}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
