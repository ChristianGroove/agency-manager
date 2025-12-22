"use client"

import { Client, Invoice, Quote, Briefing, ClientEvent } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PortalTimeline } from "./portal-timeline"
import { PortalBriefingList } from "./portal-briefing-list"
import { PortalInvoiceList } from "./portal-invoice-list"
import { ArrowRight, DollarSign, FileText, MessageSquare, AlertCircle, CheckCircle2, Clock, CreditCard, Activity } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { LottieAnimation } from "@/components/ui/lottie-animation"
import { useEffect, useState } from "react"

import { PortalBriefingView } from "./portal-briefing-view"
import { PortalServiceCard } from "./portal-service-card"
import { PortalServiceDetail } from "./portal-service-detail"
import { Service } from "@/types"


function EmptyStateAnimation() {
    const [animationData, setAnimationData] = useState<any>(null)

    useEffect(() => {
        fetch('/animations/comfortable-reading-with-digital-data-overlay-2025-10-20-06-18-32-utc.json')
            .then(res => res.json())
            .then(data => setAnimationData(data))
            .catch(err => console.error("Failed to load animation", err))
    }, [])

    if (!animationData) return null

    return <LottieAnimation animationData={animationData} loop={true} />
}

function PendingTasksAnimation() {
    const [animationData, setAnimationData] = useState<any>(null)

    useEffect(() => {
        fetch('/animations/cartoon-task-list-illustration-2025-10-20-03-26-27-utc.json')
            .then(res => res.json())
            .then(data => setAnimationData(data))
            .catch(err => console.error("Failed to load animation", err))
    }, [])

    if (!animationData) return null

    return <LottieAnimation animationData={animationData} loop={true} />
}

interface PortalDashboardProps {
    token: string
    client: Client
    invoices: Invoice[]
    quotes: Quote[]
    briefings: Briefing[]
    events: ClientEvent[]
    onPay: (invoiceIds: string[]) => void
    onViewInvoice: (invoice: Invoice) => void
    onViewQuote: (quote: Quote) => void
    settings: any
    services: Service[]
}

export function PortalDashboard({ token, client, invoices, quotes, briefings, events, onPay, onViewInvoice, onViewQuote, settings, services }: PortalDashboardProps) {
    console.log('PortalDashboard Rendered', {
        client: client.name,
        servicesCount: services?.length,
        services: services
    })
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
    const [viewBriefingId, setViewBriefingId] = useState<string | null>(null)
    const [viewServiceId, setViewServiceId] = useState<string | null>(null)

    // Calculate Stats
    const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
    const overdueInvoices = invoices.filter(i => i.status === 'overdue')
    const totalPending = pendingInvoices.reduce((acc, curr) => acc + Number(curr.total), 0)

    const openQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'draft')
    const pendingBriefings = briefings.filter(b => b.status === 'sent' || b.status === 'in_progress' || b.status === 'draft')

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

    const handleViewBriefing = (id: string) => {
        setViewBriefingId(id)
        window.scrollTo(0, 0)
    }

    if (viewServiceId) {
        const service = services.find(s => s.id === viewServiceId)
        if (service) {
            const serviceInvoices = invoices.filter(i => i.service_id === service.id)
            const serviceBriefings = briefings.filter(b => b.service_id === service.id)

            return (
                <div className="max-w-5xl mx-auto w-full pb-24">
                    <PortalServiceDetail
                        service={service}
                        invoices={serviceInvoices}
                        briefings={serviceBriefings}
                        onBack={() => setViewServiceId(null)}
                        onPay={onPay}
                        onViewInvoice={onViewInvoice}
                        onViewBriefing={handleViewBriefing} // Reuse this to open briefing view
                    />
                </div>
            )
        }
    }

    if (viewBriefingId) {
        return (
            <div className="max-w-5xl mx-auto w-full pb-24">
                <PortalBriefingView
                    token={token}
                    briefingId={viewBriefingId}
                    onBack={() => setViewBriefingId(null)}
                />
            </div>
        )
    }

    const totalSelected = invoices
        .filter(i => selectedInvoices.includes(i.id))
        .reduce((acc, curr) => acc + curr.total, 0)

    const paymentsEnabled = settings.enable_portal_payments !== false && settings.portal_modules?.payments !== false

    const hasBriefings = briefings.length > 0
    const hasQuotes = quotes.length > 0

    return (
        <div className="pb-24">
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                {/* Header Centered */}
                <div className="flex flex-col items-center text-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Hola, {client.name.split(' ')[0]}</h1>
                        <p className="text-gray-500 mt-1 max-w-lg mx-auto">Te damos la bienvenida a tu portal de cliente.</p>
                    </div>
                </div>

                {/* Empty State Animation - Only if no Pending Invoices, Quotes, or Briefings */}
                {pendingInvoices.length === 0 && openQuotes.length === 0 && pendingBriefings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in duration-700">
                        <div className="w-64 h-64 md:w-80 md:h-80 relative">
                            <EmptyStateAnimation />
                        </div>
                        <p className="text-gray-400 font-medium mt-4">Todo está en orden. ¡Disfruta tu día!</p>
                    </div>
                )}

                {/* Pending Tasks State - No Invoices, But Tasks Pending */}
                {pendingInvoices.length === 0 && (openQuotes.length > 0 || pendingBriefings.length > 0) && (
                    <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in duration-700">
                        <div className="w-64 h-64 md:w-80 md:h-80 relative">
                            <PendingTasksAnimation />
                        </div>
                        <p className="text-gray-500 font-medium mt-4 max-w-md text-center">
                            ¡Ya casi estamos! Tienes {openQuotes.length > 0 ? "cotizaciones por revisar" : ""} {openQuotes.length > 0 && pendingBriefings.length > 0 ? "y" : ""} {pendingBriefings.length > 0 ? "briefings por completar" : ""} para avanzar con {pendingBriefings.length === 1 ? `tu solicitud de "${pendingBriefings[0].template?.name || 'Servicio'}"` : "tus solicitudes"}.
                        </p>

                        {/* Central Action Buttons */}
                        <div className="flex items-center gap-4 mt-6">
                            {openQuotes.map(quote => (
                                <Button
                                    key={quote.id}
                                    className="rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30 px-6 h-11 text-sm font-bold transition-all hover:-translate-y-0.5"
                                    onClick={() => onViewQuote(quote)}
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Revisar Cotización
                                </Button>
                            ))}
                            {pendingBriefings.map(briefing => (
                                <Button
                                    key={briefing.id}
                                    className="rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-500/30 px-6 h-11 text-sm font-bold transition-all hover:-translate-y-0.5"
                                    onClick={() => handleViewBriefing(briefing.id)}
                                >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Completar Briefing
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Services Section */}
                {services && services.length > 0 && (
                    <div className="max-w-5xl mx-auto w-full mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Activity className="h-5 w-5 text-gray-400" />
                                Tus Servicios Activos
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services.map(service => {
                                // Calculate pending counts for this service
                                const servicePendingInvoices = invoices.filter(i => i.service_id === service.id && (i.status === 'pending' || i.status === 'overdue')).length
                                const serviceOverdueInvoices = invoices.filter(i => i.service_id === service.id && i.status === 'overdue').length
                                const servicePendingBriefings = briefings.filter(b => b.service_id === service.id && (b.status === 'sent' || b.status === 'in_progress')).length

                                return (
                                    <PortalServiceCard
                                        key={service.id}
                                        service={service}
                                        pendingInvoicesCount={servicePendingInvoices}
                                        overdueInvoicesCount={serviceOverdueInvoices}
                                        pendingBriefingsCount={servicePendingBriefings}
                                        onClick={() => setViewServiceId(service.id)}
                                    />
                                )
                            })}
                        </div>
                    </div>
                )}

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
            </div>

            {/* Floating "Smart" Action Center */}
            {/* Bottom UI Stack (Fixed): Buttons -> Action Block -> Footer */}
            <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center gap-8 pb-8 px-4 pointer-events-none animate-in slide-in-from-bottom-4 fade-in duration-1000 bg-gradient-to-t from-gray-50/80 via-gray-50/50 to-transparent">

                {/* 1. Top Row: Action Buttons (Pointer Events Auto) */}
                {/* Hide buttons here if they are shown in the center (i.e. if pendingInvoices === 0) */}
                {pendingInvoices.length > 0 && (openQuotes.length > 0 || pendingBriefings.length > 0) && (
                    <div className="flex items-center gap-2 pointer-events-auto">
                        {/* Quotes Buttons */}
                        {openQuotes.map(quote => (
                            <Button
                                key={quote.id}
                                size="sm"
                                className="rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30 px-5 h-10 text-xs font-bold transition-all hover:-translate-y-0.5"
                                onClick={() => onViewQuote(quote)}
                            >
                                <FileText className="h-3.5 w-3.5 mr-2" />
                                Revisar Cotización
                            </Button>
                        ))}

                        {/* Briefings Buttons */}
                        {pendingBriefings.map(briefing => (
                            <Button
                                key={briefing.id}
                                size="sm"
                                className="rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-500/30 px-5 h-10 text-xs font-bold transition-all hover:-translate-y-0.5"
                                onClick={() => handleViewBriefing(briefing.id)}
                            >
                                <MessageSquare className="h-3.5 w-3.5 mr-2" />
                                Completar Briefing
                            </Button>
                        ))}
                    </div>
                )}

                {/* 2. Middle Row: Status Text + Clock (Glass Block) (Pointer Events Auto) */}
                <div className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full py-2 px-6 ring-1 ring-black/5 w-full md:w-auto min-w-[320px] flex items-center justify-between gap-4 relative">

                    {/* Spacer for centering balance */}
                    <div className="w-9 hidden md:block"></div>

                    {/* Centered Status */}
                    <div className="flex-1 text-center">
                        {pendingInvoices.length > 0 ? (
                            <p className="text-sm font-medium text-gray-700">
                                <span className="font-bold text-gray-900">Pendientes:</span> Tienes {pendingInvoices.length} facturas por <span className="text-gray-900 font-bold">{formatCurrency(totalPending)}</span>.
                            </p>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <p className="text-sm font-medium text-gray-600">¡Todo al día! No tienes pagos pendientes.</p>
                            </div>
                        )}
                    </div>

                    {/* Clock Icon (Right Aligned) */}
                    <div className="shrink-0">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100/50 text-gray-400 hover:text-gray-600 h-9 w-9">
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

                {/* 3. Bottom Row: Footer (Pointer Events Auto) */}
                <footer className="pointer-events-auto text-center text-sm text-gray-400">
                    &copy; 2026 Pixy / private design services. Todos los derechos reservados.
                </footer>
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
