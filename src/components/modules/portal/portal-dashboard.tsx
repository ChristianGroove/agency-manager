"use client"

import { Client, Invoice, Quote, Briefing, ClientEvent } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PortalTimeline } from "./portal-timeline"
import { PortalBriefingList } from "./portal-briefing-list"
import { PortalInvoiceList } from "./portal-invoice-list"
import { ArrowRight, DollarSign, FileText, MessageSquare, AlertCircle, CheckCircle2, Clock, CreditCard } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface PortalDashboardProps {
    client: Client
    invoices: Invoice[]
    quotes: Quote[]
    briefings: Briefing[]
    events: ClientEvent[]
    onPay: (invoiceIds: string[]) => void
    onViewInvoice: (invoice: Invoice) => void
    onViewQuote: (quote: Quote) => void
    settings: any
}

export function PortalDashboard({ client, invoices, quotes, briefings, events, onPay, onViewInvoice, onViewQuote, settings }: PortalDashboardProps) {
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])

    // Calculate Stats
    const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
    const overdueInvoices = invoices.filter(i => i.status === 'overdue')
    const totalPending = pendingInvoices.reduce((acc, curr) => acc + Number(curr.total), 0)

    const openQuotes = quotes.filter(q => q.status === 'sent')
    const pendingBriefings = briefings.filter(b => b.status === 'sent' || b.status === 'in_progress')

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount)
    }

    const toggleInvoice = (invoiceId: string) => {
        if (settings.enable_multi_invoice_payment === false) {
            setSelectedInvoices(prev => prev.includes(invoiceId) ? [] : [invoiceId])
            return
        }
        setSelectedInvoices(prev =>
            prev.includes(invoiceId) ? prev.filter(id => id !== invoiceId) : [...prev, invoiceId]
        )
    }

    const toggleAll = () => {
        if (settings.enable_multi_invoice_payment === false) return
        const pendingIds = pendingInvoices.map(i => i.id)
        if (selectedInvoices.length === pendingIds.length) {
            setSelectedInvoices([])
        } else {
            setSelectedInvoices(pendingIds)
        }
    }

    const totalSelected = invoices
        .filter(i => selectedInvoices.includes(i.id))
        .reduce((acc, curr) => acc + curr.total, 0)

    const paymentsEnabled = settings.enable_portal_payments !== false && settings.portal_modules?.payments !== false

    const hasBriefings = briefings.length > 0
    const hasQuotes = quotes.length > 0

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Hola, {client.name.split(' ')[0]}</h1>
                    <p className="text-gray-500 mt-1">Aquí tienes el resumen de tu cuenta y próximos pasos.</p>
                </div>
                <div className="flex items-center gap-2">
                    {overdueInvoices.length > 0 ? (
                        <Badge variant="destructive" className="h-8 px-3 text-sm">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Pagos Pendientes
                        </Badge>
                    ) : (
                        <Badge className="h-8 px-3 text-sm bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Al día
                        </Badge>
                    )}
                </div>
            </div>

            {/* Middle Section: Invoices (Always visible if enabled) */}
            {settings.portal_modules?.invoices !== false && (
                <div className="max-w-5xl mx-auto w-full">
                    <PortalInvoiceList
                        invoices={invoices}
                        settings={settings}
                        selectedInvoices={selectedInvoices}
                        onToggle={toggleInvoice}
                        onToggleAll={toggleAll}
                        onView={onViewInvoice}
                    />
                </div>
            )}

            {/* Bottom Section: Action Center (Horizontal) */}
            <div className="relative mt-12">
                {/* Floating Timeline Button */}
                <div className="absolute bottom-full right-0 mb-3 z-10">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full shadow-sm bg-white hover:bg-gray-50 border-gray-200 text-gray-600 h-10 w-10">
                                <Clock className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-gray-500" />
                                    Actividad Reciente
                                </DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                                <PortalTimeline events={events} />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            Centro de Acción
                        </CardTitle>
                        <CardDescription>
                            Resumen de tareas pendientes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                            {/* Invoices Summary */}
                            {pendingInvoices.length > 0 && (
                                <div className="flex-1 w-full lg:w-auto">
                                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100 h-full">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-white border border-amber-200 flex items-center justify-center shrink-0">
                                                <DollarSign className="h-4 w-4 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{pendingInvoices.length} Facturas pendientes</p>
                                                <p className="text-xs text-amber-700 font-medium">{formatCurrency(totalPending)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Quotes List (Compact) */}
                            {openQuotes.length > 0 && (
                                <div className="flex-1 w-full lg:w-auto space-y-2">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cotizaciones</h4>
                                    <div className="flex flex-col gap-2">
                                        {openQuotes.map(quote => (
                                            <div key={quote.id} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-100">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-purple-500" />
                                                    <span className="text-sm font-medium text-gray-900">#{quote.number}</span>
                                                </div>
                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-100" onClick={() => onViewQuote(quote)}>
                                                    Ver
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Briefings List (Compact) */}
                            {pendingBriefings.length > 0 && (
                                <div className="flex-1 w-full lg:w-auto space-y-2">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Briefings</h4>
                                    <div className="flex flex-col gap-2">
                                        {pendingBriefings.map(briefing => (
                                            <div key={briefing.id} className="flex items-center justify-between p-2 bg-pink-50 rounded-lg border border-pink-100">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <MessageSquare className="h-4 w-4 text-pink-500 shrink-0" />
                                                    <span className="text-sm font-medium text-gray-900 truncate">{briefing.service_name}</span>
                                                </div>
                                                <Link href={`/portal/${client.portal_short_token || client.portal_token}/briefing/${briefing.id}`}>
                                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-pink-700 hover:text-pink-800 hover:bg-pink-100">
                                                        Ir
                                                    </Button>
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {pendingInvoices.length === 0 && openQuotes.length === 0 && pendingBriefings.length === 0 && (
                                <div className="w-full flex items-center justify-center py-4 text-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <span className="text-gray-500 font-medium">¡Todo al día! No tienes tareas pendientes.</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Bar for Payments */}
            {selectedInvoices.length > 0 && paymentsEnabled && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50 animate-in slide-in-from-bottom">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total a Pagar ({selectedInvoices.length})</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSelected)}</p>
                        </div>
                        <Button
                            size="lg"
                            className="text-white px-8"
                            style={{ backgroundColor: settings.portal_primary_color || '#F205E2' }}
                            onClick={() => onPay(selectedInvoices)}
                        >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pagar Ahora
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
