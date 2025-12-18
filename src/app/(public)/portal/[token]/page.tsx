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

    const handlePay = async (invoice: Invoice) => {
        try {
            const response = await fetch('/api/wompi/signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceId: invoice.id })
            })

            if (!response.ok) throw new Error('Error generating signature')

            const { reference, amountInCents, currency, signature, publicKey } = await response.json()

            const redirectUrl = window.location.href // Return to this page

            const wompiUrl = `https://checkout.wompi.co/p/?public-key=${publicKey}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${reference}&signature:integrity=${signature}&redirect-url=${encodeURIComponent(redirectUrl)}&customer-data:email=${client?.email || ''}&customer-data:full-name=${encodeURIComponent(client?.name || '')}`

            window.location.href = wompiUrl

        } catch (error) {
            console.error('Payment error:', error)
            alert('Error al iniciar el pago')
        }
    }



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

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-pink" /></div>
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
    }

    if (!client) return null

    const pendingTotal = invoices
        .filter(i => i.status === 'pending' || i.status === 'overdue')
        .reduce((acc, curr) => acc + curr.total, 0)

    const overdueTotal = invoices
        .filter(i => i.status === 'overdue')
        .reduce((acc, curr) => acc + curr.total, 0)

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col items-center gap-6 text-center">
                <div>
                    <img src="/branding/logo dark.svg" alt="Pixy" className="h-10 mb-6 mx-auto" />
                    <h1 className="text-2xl font-bold text-gray-900">Hola, {client.name}</h1>
                    <p className="text-gray-500">Este es tu estado de cuenta actualizado.</p>
                </div>

            </div>

            {/* Summary Cards - Mobile Optimized */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white border-l-4 border-l-brand-pink shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total a Pagar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">${pendingTotal.toLocaleString()}</div>
                        <p className="text-xs text-gray-400 mt-1">Facturas pendientes</p>
                    </CardContent>
                </Card>
                <Card className={cn("bg-white border-l-4 shadow-sm", overdueTotal > 0 ? "border-l-red-500" : "border-l-green-500")}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Vencido</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-bold", overdueTotal > 0 ? "text-red-600" : "text-green-600")}>
                            ${overdueTotal.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Requiere atención inmediata</p>
                    </CardContent>
                </Card>
            </div>

            {/* Invoices List - Mobile: Cards, Desktop: Table */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Tus Facturas</h2>

                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-4">
                    {invoices.map((invoice) => (
                        <Card key={invoice.id} className="overflow-hidden">
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-bold text-gray-900">#{invoice.number}</span>
                                        <p className="text-xs text-gray-500">{new Date(invoice.date).toLocaleDateString()}</p>
                                    </div>
                                    <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>
                                        {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-gray-400">Total</p>
                                        <p className="text-xl font-bold text-gray-900">${invoice.total.toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {invoice.status !== 'paid' && (
                                            <Button
                                                size="sm"
                                                className="bg-brand-pink text-white h-8"
                                                onClick={() => handlePay(invoice)}
                                            >
                                                Pagar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Factura</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Vencimiento</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Monto</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">#{invoice.number}</td>
                                    <td className="px-6 py-4 text-gray-600">{new Date(invoice.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-gray-600">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>
                                            {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">${invoice.total.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {invoice.status !== 'paid' && (
                                                <Button
                                                    size="sm"
                                                    className="bg-brand-pink hover:bg-brand-pink/90 text-white"
                                                    onClick={() => handlePay(invoice)}
                                                >
                                                    Pagar
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center py-8 border-t">
                <p className="text-sm text-gray-400">Portal Seguro</p>
                <p className="text-xs text-gray-300 font-mono mt-1">Token: {params.token?.slice(0, 8)}...</p>
            </div>
        </div>
    )
}
