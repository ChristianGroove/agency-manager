"use client"

import { Service, Invoice, Briefing } from "@/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Box, Calendar } from "lucide-react"
import { PortalInvoiceList } from "./portal-invoice-list"
import { PortalBriefingList } from "./portal-briefing-list"

interface PortalServiceDetailProps {
    service: Service
    invoices: Invoice[]
    briefings: Briefing[]
    onBack: () => void
    onPay: (invoiceIds: string[]) => void
    onViewInvoice: (invoice: Invoice) => void
    onViewBriefing: (briefingId: string) => void
}

export function PortalServiceDetail({ service, invoices, briefings, onBack, onPay, onViewInvoice, onViewBriefing }: PortalServiceDetailProps) {
    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateString))
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Button variant="ghost" onClick={onBack} className="pl-0 hover:bg-transparent hover:text-brand-pink -ml-2 mb-2">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver a Servicios
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                            <Box className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                {service.created_at && (
                                    <span className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Iniciado el {formatDate(service.created_at)}
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${service.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {service.status === 'active' ? 'Activo' : service.status}
                                </span>
                                {(service.quantity || 1) > 1 && (
                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-100">
                                        {service.quantity} Unidades
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {service.description && (
                <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-100 text-gray-600">
                    {service.description}
                </div>
            )}

            <div className="grid gap-8">
                {/* Invoices Section */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        Facturación del Servicio
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                            {invoices.length}
                        </span>
                    </h2>
                    {invoices.length > 0 ? (
                        <PortalInvoiceList
                            invoices={invoices}
                            onView={onViewInvoice}
                            compact
                        />
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-gray-500 text-sm">No hay facturas registradas para este servicio.</p>
                        </div>
                    )}
                </section>

                {/* Briefings Section */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        Briefings y Entregables
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                            {briefings.length}
                        </span>
                    </h2>
                    {briefings.length > 0 ? (
                        <PortalBriefingList
                            briefings={briefings}
                            onView={onViewBriefing}
                        />
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-gray-500 text-sm">No hay briefings asociados a este servicio.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
