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
            {(pendingInvoices.length > 0 || openQuotes.length > 0 || pendingBriefings.length > 0) && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 animate-in slide-in-from-bottom-10 fade-in duration-700">
                    <div className="bg-white/80 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 md:gap-6 ring-1 ring-black/5">

                        {/* Title / Icon */}
                        <div className="flex items-center gap-2 text-gray-400 border-r border-gray-200 pr-4 hidden md:flex">
                            <AlertCircle className="h-5 w-5 text-brand-pink" />
                            <span className="text-xs font-semibold uppercase tracking-widest">Pendientes</span>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar w-full md:w-auto py-1">

                            {/* Invoices Pill */}
                            {pendingInvoices.length > 0 && (
                                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 px-3 py-1.5 rounded-full shrink-0 shadow-sm transition-all hover:bg-amber-500/20 hover:scale-105 cursor-default">
                                    <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-sm">
                                        <DollarSign className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] font-bold uppercase opacity-70">Facturas ({pendingInvoices.length})</span>
                                        <span className="text-xs font-bold">{formatCurrency(totalPending)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Quotes Pills */}
                            {openQuotes.map(quote => (
                                <div key={quote.id} className="group flex items-center gap-2 bg-purple-500/5 border border-purple-500/10 text-purple-700 px-3 py-1.5 rounded-full shrink-0 transition-all hover:bg-purple-500/10 hover:shadow-sm cursor-pointer" onClick={() => onViewQuote(quote)}>
                                    <FileText className="h-3.5 w-3.5 text-purple-500" />
                                    <span className="text-xs font-semibold">#{quote.number}</span>
                                    <ArrowRight className="h-3 w-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all text-purple-400" />
                                </div>
                            ))}

                            {/* Briefings Pills */}
                            {pendingBriefings.map(briefing => (
                                <Link key={briefing.id} href={`/portal/${client.portal_short_token || client.portal_token}/briefing/${briefing.id}`}>
                                    <div className="group flex items-center gap-2 bg-pink-500/5 border border-pink-500/10 text-pink-700 px-3 py-1.5 rounded-full shrink-0 transition-all hover:bg-pink-500/10 hover:shadow-sm cursor-pointer">
                                        <MessageSquare className="h-3.5 w-3.5 text-pink-500" />
                                        <span className="text-xs font-semibold max-w-[100px] truncate">{briefing.template?.name || "Briefing"}</span>
                                        <ArrowRight className="h-3 w-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all text-pink-400" />
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Floating Timeline Button (Integrated) */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 shrink-0">
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
            )}

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
