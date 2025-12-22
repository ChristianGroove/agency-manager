"use client"

import { useState, useEffect } from "react"
import { Service, Invoice, Briefing } from "@/types"
import { PortalServiceCard } from "./portal-service-card"
import { PortalServiceDetail } from "./portal-service-detail"
import { PortalBriefingView } from "./portal-briefing-view"
import { Activity } from "lucide-react"

interface PortalServicesTabProps {
    services: Service[]
    invoices: Invoice[]
    briefings: Briefing[]
    onPay: (invoiceIds: string[]) => void
    onViewInvoice: (invoice: Invoice) => void
    initialBriefingId?: string | null
    onBriefingClosed?: () => void
}

export function PortalServicesTab({ services, invoices, briefings, onPay, onViewInvoice, initialBriefingId, onBriefingClosed }: PortalServicesTabProps) {
    const [viewServiceId, setViewServiceId] = useState<string | null>(null)
    const [viewBriefingId, setViewBriefingId] = useState<string | null>(initialBriefingId || null)

    // Sync with prop if it changes (e.g. from notification click while already on tab)
    useEffect(() => {
        if (initialBriefingId) {
            setViewBriefingId(initialBriefingId)
        }
    }, [initialBriefingId])

    // Handle Deep Link to Briefing
    const handleViewBriefing = (id: string) => {
        setViewBriefingId(id)
        window.scrollTo(0, 0)
    }

    const handleBackFromBriefing = () => {
        setViewBriefingId(null)
        if (onBriefingClosed) onBriefingClosed()
    }

    // 1. Briefing View
    if (viewBriefingId) {
        return (
            <div className="max-w-5xl mx-auto w-full pb-24 animate-in fade-in slide-in-from-right-4">
                <PortalBriefingView
                    briefingId={viewBriefingId}
                    onBack={handleBackFromBriefing}
                />
            </div>
        )
    }

    // 2. Service Detail View
    if (viewServiceId) {
        const service = services.find(s => s.id === viewServiceId)
        if (service) {
            const serviceInvoices = invoices.filter(i => i.service_id === service.id)
            const serviceBriefings = briefings.filter(b => b.service_id === service.id)

            return (
                <div className="max-w-5xl mx-auto w-full pb-24 animate-in fade-in slide-in-from-right-4">
                    <PortalServiceDetail
                        service={service}
                        invoices={serviceInvoices}
                        briefings={serviceBriefings}
                        onBack={() => setViewServiceId(null)}
                        onPay={onPay}
                        onViewInvoice={onViewInvoice}
                        onViewBriefing={handleViewBriefing}
                    />
                </div>
            )
        }
    }

    // 3. Service List View
    return (
        <div className="max-w-5xl mx-auto w-full mb-12 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-gray-400" />
                    Tus Servicios Activos
                </h2>
            </div>

            {services.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                    <p className="text-gray-500">No tienes servicios activos en este momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map(service => {
                        const servicePendingInvoices = invoices.filter(i => i.service_id === service.id && (i.status === 'pending' || i.status === 'overdue'))
                        const servicePendingInvoicesIds = servicePendingInvoices.map(i => i.id)
                        const serviceOverdueInvoices = invoices.filter(i => i.service_id === service.id && i.status === 'overdue').length
                        const servicePendingBriefings = briefings.filter(b => b.service_id === service.id && (b.status === 'sent' || b.status === 'in_progress')).length

                        return (
                            <PortalServiceCard
                                key={service.id}
                                service={service}
                                pendingInvoicesCount={servicePendingInvoices.length}
                                overdueInvoicesCount={serviceOverdueInvoices}
                                pendingBriefingsCount={servicePendingBriefings}
                                onClick={() => setViewServiceId(service.id)}
                                onPay={(serviceId) => onPay(servicePendingInvoicesIds)} // Quick pay all pending invoices for this service
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}
