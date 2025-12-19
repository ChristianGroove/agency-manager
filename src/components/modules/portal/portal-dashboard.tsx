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

            {/* Floating "Smart" Action Center */}
            {/* Floating "Smart" Action Center */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 animate-in slide-in-from-bottom-10 fade-in duration-700">
                <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full p-2 pl-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 ring-1 ring-black/5">

                    {/* Status Text (Left) */}
                    <div className="flex-1 text-center md:text-left">
                        {pendingInvoices.length > 0 ? (
                            <p className="text-sm font-medium text-gray-700">
                                <span className="font-bold text-gray-900">Pendientes:</span> Tienes {pendingInvoices.length} facturas por <span className="text-gray-900 font-bold">{formatCurrency(totalPending)}</span>.
                            </p>
                        ) : (
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <p className="text-sm font-medium text-gray-600">¡Todo al día! No tienes pagos pendientes.</p>
                            </div>
                        )}
                    </div>

                    {/* Actions (Right) */}
                    <div className="flex items-center gap-2 shrink-0">

                        {/* Quotes Buttons */}
                        {openQuotes.map(quote => (
                            <Button
                                key={quote.id}
                                size="sm"
                                className="rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 px-4 h-9 text-xs font-semibold"
                                onClick={() => onViewQuote(quote)}
                            >
                                Revisar Cotización
                            </Button>
                        ))}

                        {/* Briefings Buttons */}
                        {pendingBriefings.map(briefing => (
                            <Link key={briefing.id} href={`/portal/${client.portal_short_token || client.portal_token}/briefing/${briefing.id}`}>
                                <Button
                                    size="sm"
                                    className="rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-500/20 px-4 h-9 text-xs font-semibold"
                                >
                                    Completar Briefing
                                </Button>
                            </Link>
                        ))}

                        {/* Divider if actions exist */}
                        {(openQuotes.length > 0 || pendingBriefings.length > 0) && (
                            <div className="h-4 w-px bg-gray-300 mx-1 hidden md:block"></div>
                        )}

                        {/* Floating Timeline Button (Integrated) */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 h-9 w-9">
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
                </div>
            </div>

            {/* Bottom Bar for Payments */}
            {
                selectedInvoices.length > 0 && paymentsEnabled && (
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
                )
            }
        </div >
    )
}
