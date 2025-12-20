"use client"

import { useState } from "react"
import { Invoice } from "@/types"
import { PortalInvoiceList } from "./portal-invoice-list"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"

interface PortalBillingTabProps {
    invoices: Invoice[]
    settings: any
    onPay: (invoiceIds: string[]) => void
    onViewInvoice: (invoice: Invoice) => void
}

export function PortalBillingTab({ invoices, settings, onPay, onViewInvoice }: PortalBillingTabProps) {
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])

    // Calculate Stats
    const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')

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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount)
    }

    const paymentsEnabled = settings.enable_portal_payments !== false && settings.portal_modules?.payments !== false

    return (
        <div className="max-w-5xl mx-auto w-full pb-32 animate-in fade-in duration-500">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Facturación</h2>
                    <p className="text-gray-500">Historial y pagos pendientes</p>
                </div>
                {/* Desktop Pay Button (if functionality desired here, but bottom bar covers it) */}
            </div>

            <PortalInvoiceList
                invoices={invoices}
                settings={settings}
                selectedInvoices={selectedInvoices}
                onToggle={toggleInvoice}
                onToggleAll={toggleAll}
                onView={onViewInvoice}
            />

            {/* Sticky Bottom Payment Bar (Scoped to this Tab) */}
            {selectedInvoices.length > 0 && paymentsEnabled && (
                <div className="fixed bottom-[70px] md:bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-40 animate-in slide-in-from-bottom">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total seleccionado ({selectedInvoices.length})</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSelected)}</p>
                        </div>
                        <Button
                            size="lg"
                            className="text-white px-8 shadow-lg hover:shadow-xl transition-all"
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
